import { ensureEditors, INITIAL_OWNERS } from "./db.js";
import { ApiError } from "./http.js";

let cachedKeys = null;
let cachedKeysUntil = 0;

function decodeBase64Url(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJsonSegment(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}

async function getAccessKeys(teamDomain) {
  if (cachedKeys && cachedKeysUntil > Date.now()) return cachedKeys;

  const response = await fetch(`${teamDomain}/cdn-cgi/access/certs`);
  if (!response.ok) {
    throw new ApiError(503, "Editor sign-in is temporarily unavailable.", "auth_unavailable");
  }

  const body = await response.json();
  cachedKeys = body.keys || [];
  cachedKeysUntil = Date.now() + 60 * 60 * 1000;
  return cachedKeys;
}

async function verifyAccessToken(token, env) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new ApiError(401, "Your editor session is invalid.", "invalid_session");
  }

  const header = decodeJsonSegment(parts[0]);
  const payload = decodeJsonSegment(parts[1]);
  const teamDomain = String(env.ACCESS_TEAM_DOMAIN || "").replace(/\/$/, "");
  const audience = env.ACCESS_AUD;

  if (!teamDomain || !audience) {
    throw new ApiError(503, "Editor sign-in has not been configured.", "auth_not_configured");
  }

  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (
    header.alg !== "RS256" ||
    payload.iss !== teamDomain ||
    !audiences.includes(audience) ||
    !payload.email ||
    payload.exp <= now ||
    (payload.nbf && payload.nbf > now)
  ) {
    throw new ApiError(401, "Your editor session is invalid or expired.", "invalid_session");
  }

  const keys = await getAccessKeys(teamDomain);
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) {
    cachedKeysUntil = 0;
    throw new ApiError(401, "Your editor session could not be verified.", "invalid_session");
  }

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    decodeBase64Url(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );

  if (!valid) {
    throw new ApiError(401, "Your editor session could not be verified.", "invalid_session");
  }

  return String(payload.email).trim().toLowerCase();
}

export async function authenticate(request, env) {
  if (!env.DB) {
    throw new ApiError(503, "The catalog database is not configured.", "database_not_configured");
  }

  const hostname = new URL(request.url).hostname;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  let email;

  if (isLocal && env.DEV_AUTH_EMAIL) {
    email = String(env.DEV_AUTH_EMAIL).trim().toLowerCase();
  } else {
    const token = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!token) {
      throw new ApiError(401, "Sign in to use the product editor.", "sign_in_required");
    }
    email = await verifyAccessToken(token, env);
  }

  await ensureEditors(env.DB);
  const editor = await env.DB
    .prepare("SELECT email, role FROM editors WHERE email = ? COLLATE NOCASE")
    .bind(email)
    .first();

  if (!editor) {
    throw new ApiError(403, "This email has not been given editor access.", "not_an_editor");
  }

  return {
    email: editor.email,
    role: editor.role,
    isInitialOwner: INITIAL_OWNERS.includes(editor.email.toLowerCase()),
  };
}
