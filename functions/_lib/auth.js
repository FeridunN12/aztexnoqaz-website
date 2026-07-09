import { ensureEditors } from "./db.js";
import { ApiError } from "./http.js";

const SESSION_COOKIE = "aztexnogaz_editor";
const SESSION_TTL_SECONDS = 365 * 24 * 60 * 60;
const PASSWORD_ITERATIONS = 210_000;
const PASSWORD_HMAC_VERSION = 0;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 8;
const encoder = new TextEncoder();

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

async function derivePasswordHash(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    key,
    256,
  );
  return new Uint8Array(bits);
}

async function derivePepperedPasswordHash(password, salt, pepper) {
  if (!pepper || String(pepper).length < 32) {
    throw new ApiError(503, "Editor login is not configured.", "auth_not_configured");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${bytesToBase64Url(salt)}.${password}`),
  );
  return derivePasswordHash(bytesToBase64Url(new Uint8Array(digest)), salt, PASSWORD_ITERATIONS);
}

function equalBytes(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

function readCookie(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  for (const part of cookies.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

function cleanDeviceName(value) {
  const name = String(value || "").trim();
  if (name.length < 2 || name.length > 60) {
    throw new ApiError(400, "Enter a name for this device.", "invalid_device_name");
  }
  return name;
}

function platformFromRequest(request) {
  const clientHint = (request.headers.get("Sec-CH-UA-Platform") || "").replaceAll('"', "").trim();
  if (clientHint) return clientHint.slice(0, 40);
  const userAgent = request.headers.get("User-Agent") || "";
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/Android/i.test(userAgent)) return "Android";
  if (/iPhone|iPad|iOS/i.test(userAgent)) return "iOS";
  if (/Macintosh|Mac OS/i.test(userAgent)) return "macOS";
  if (/Linux/i.test(userAgent)) return "Linux";
  return "Browser";
}

export function validatePassword(password) {
  const value = String(password || "");
  if (value.length < 8 || value.length > 128) {
    throw new ApiError(400, "Passwords must be between 8 and 128 characters.", "invalid_password");
  }
  return value;
}

export async function createPasswordRecord(password, pepper) {
  const value = validatePassword(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePepperedPasswordHash(value, salt, pepper);
  return {
    salt: bytesToBase64Url(salt),
    hash: bytesToBase64Url(hash),
    iterations: PASSWORD_HMAC_VERSION,
  };
}

export async function verifyPassword(password, editor, pepper) {
  if (!editor?.password_salt || !editor?.password_hash) return false;
  const value = String(password || "");
  if (!value || value.length > 128) return false;
  const salt = base64UrlToBytes(editor.password_salt);
  const iterations = Number(editor.password_iterations);
  const candidate =
    iterations === PASSWORD_HMAC_VERSION
      ? await derivePepperedPasswordHash(value, salt, pepper)
      : await derivePasswordHash(value, salt, iterations || PASSWORD_ITERATIONS);
  return equalBytes(candidate, base64UrlToBytes(editor.password_hash));
}

export function getSessionToken(request) {
  return readCookie(request, SESSION_COOKIE);
}

export function sessionCookie(token) {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export async function createEditorSession(db, request, editorEmail, deviceName) {
  const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
  await db
    .prepare(
      `INSERT INTO editor_sessions (
         token_hash, editor_email, device_name, platform, user_agent,
         created_at, last_seen_at, expires_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      tokenHash,
      editorEmail,
      cleanDeviceName(deviceName),
      platformFromRequest(request),
      (request.headers.get("User-Agent") || "").slice(0, 500),
      now.toISOString(),
      now.toISOString(),
      expiresAt,
    )
    .run();
  return { token, expiresAt };
}

export async function deleteEditorSession(db, request) {
  const token = getSessionToken(request);
  if (!token) return;
  await db.prepare("DELETE FROM editor_sessions WHERE token_hash = ?").bind(await sha256(token)).run();
}

export async function authenticate(request, env) {
  if (!env.DB) {
    throw new ApiError(503, "The catalog database is not configured.", "database_not_configured");
  }
  await ensureEditors(env.DB);
  const token = getSessionToken(request);
  if (!token) throw new ApiError(401, "Sign in to use the product editor.", "sign_in_required");

  const tokenHash = await sha256(token);
  const editor = await env.DB
    .prepare(
      `SELECT
         e.email, e.role, e.display_name, e.password_hash,
         s.device_name, s.platform, s.expires_at
       FROM editor_sessions s
       JOIN editors e ON e.email = s.editor_email
       WHERE s.token_hash = ?`,
    )
    .bind(tokenHash)
    .first();

  const now = new Date();
  if (!editor?.password_hash || new Date(editor.expires_at) <= now) {
    await env.DB.prepare("DELETE FROM editor_sessions WHERE token_hash = ?").bind(tokenHash).run();
    throw new ApiError(401, "Your editor session expired. Sign in again.", "invalid_session");
  }

  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
  await env.DB
    .prepare(
      `UPDATE editor_sessions
       SET last_seen_at = ?, expires_at = ?
       WHERE token_hash = ?`,
    )
    .bind(now.toISOString(), expiresAt, tokenHash)
    .run();

  return {
    email: editor.email,
    role: "owner",
    displayName: editor.display_name || editor.email,
    deviceName: editor.device_name,
    platform: editor.platform,
    sessionToken: token,
  };
}

async function loginAttemptKey(request, email) {
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  return sha256(`${ip}|${String(email).toLowerCase()}`);
}

export async function enforceLoginRateLimit(db, request, email) {
  const key = await loginAttemptKey(request, email);
  const row = await db.prepare("SELECT attempts, window_started_at FROM login_attempts WHERE attempt_key = ?").bind(key).first();
  if (
    row &&
    Date.now() - new Date(row.window_started_at).getTime() < LOGIN_WINDOW_MS &&
    Number(row.attempts) >= MAX_LOGIN_ATTEMPTS
  ) {
    throw new ApiError(429, "Too many sign-in attempts. Try again in 15 minutes.", "rate_limited");
  }
  return key;
}

export async function recordLoginFailure(db, key) {
  const row = await db.prepare("SELECT attempts, window_started_at FROM login_attempts WHERE attempt_key = ?").bind(key).first();
  const now = new Date();
  const expired = !row || Date.now() - new Date(row.window_started_at).getTime() >= LOGIN_WINDOW_MS;
  await db
    .prepare(
      `INSERT INTO login_attempts (attempt_key, attempts, window_started_at)
       VALUES (?, ?, ?)
       ON CONFLICT(attempt_key) DO UPDATE SET
         attempts = excluded.attempts,
         window_started_at = excluded.window_started_at`,
    )
    .bind(key, expired ? 1 : Number(row.attempts) + 1, expired ? now.toISOString() : row.window_started_at)
    .run();
}

export async function clearLoginFailures(db, key) {
  await db.prepare("DELETE FROM login_attempts WHERE attempt_key = ?").bind(key).run();
}
