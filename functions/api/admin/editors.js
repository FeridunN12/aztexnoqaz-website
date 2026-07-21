import { createPasswordRecord } from "../../_lib/auth.js";
import { ensureEditors, writeAudit } from "../../_lib/db.js";
import {
  ApiError,
  errorResponse,
  json,
  readJson,
  requireSameOrigin,
} from "../../_lib/http.js";
import {
  ensurePlatformSchema,
  requirePermission,
  STAFF_ROLES,
} from "../../_lib/platform.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestGet({ env, data }) {
  try {
    requirePermission(data.editor, "team");
    await ensureEditors(env.DB);
    await ensurePlatformSchema(env.DB);
    const now = new Date().toISOString();
    await env.DB
      .prepare(
        `INSERT OR IGNORE INTO staff_profiles (editor_email, platform_role, created_at, updated_at)
         SELECT email, 'administrator', ?, ? FROM editors WHERE password_hash IS NOT NULL`,
      )
      .bind(now, now)
      .run();
    await env.DB.prepare("DELETE FROM editor_sessions WHERE expires_at <= ?").bind(now).run();
    const editorResult = await env.DB
      .prepare(
        `SELECT
           e.email, e.role, e.display_name AS displayName,
           COALESCE(s.platform_role, 'viewer') AS platformRole,
           added_at AS addedAt, added_by AS addedBy
         FROM editors e
         LEFT JOIN staff_profiles s ON s.editor_email = e.email COLLATE NOCASE
         WHERE e.password_hash IS NOT NULL
         ORDER BY display_name, email`,
      )
      .all();
    const sessionResult = await env.DB
      .prepare(
        `SELECT
           editor_email AS editorEmail, device_name AS deviceName,
           platform, created_at AS createdAt, last_seen_at AS lastSeenAt
         FROM editor_sessions
         WHERE expires_at > ?
         ORDER BY last_seen_at DESC`,
      )
      .bind(now)
      .all();
    const sessionsByEmail = new Map();
    for (const session of sessionResult.results) {
      const key = session.editorEmail.toLowerCase();
      if (!sessionsByEmail.has(key)) sessionsByEmail.set(key, []);
      sessionsByEmail.get(key).push(session);
    }
    return json({
      currentEditor: data.editor.email,
      editors: editorResult.results.map((editor) => ({
        ...editor,
        role: "owner",
        devices: sessionsByEmail.get(editor.email.toLowerCase()) || [],
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPost({ request, env, data }) {
  try {
    requireSameOrigin(request);
    requirePermission(data.editor, "team");
    await ensurePlatformSchema(env.DB);
    const body = await readJson(request);
    const email = String(body.email || "").trim().toLowerCase();
    const displayName = String(body.displayName || "").trim();
    const platformRole = STAFF_ROLES.has(String(body.platformRole || ""))
      ? String(body.platformRole)
      : "administrator";
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      throw new ApiError(400, "Enter a valid email address.", "invalid_email");
    }
    if (displayName.length < 2 || displayName.length > 60) {
      throw new ApiError(400, "Enter the editor's name.", "invalid_name");
    }
    const existing = await env.DB
      .prepare("SELECT email FROM editors WHERE email = ? COLLATE NOCASE")
      .bind(email)
      .first();
    if (existing) {
      throw new ApiError(409, "An account with that email already exists.", "editor_exists");
    }

    const now = new Date().toISOString();
    const password = await createPasswordRecord(body.password, env.AUTH_PEPPER);
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO editors (
           email, role, added_at, added_by, display_name,
           password_salt, password_hash, password_iterations, updated_at
         ) VALUES (?, 'owner', ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        email,
        now,
        data.editor.email,
        displayName,
        password.salt,
        password.hash,
        password.iterations,
        now,
      ),
      env.DB
        .prepare(
          `INSERT INTO staff_profiles (editor_email, platform_role, created_at, updated_at)
           VALUES (?, ?, ?, ?)`,
        )
        .bind(email, platformRole, now, now),
    ]);
    await writeAudit(env.DB, data.editor.email, "add", "editor", email);
    return json(
      {
        editor: {
          email,
          displayName,
          role: "owner",
          platformRole,
          devices: [],
          addedAt: now,
          addedBy: data.editor.email,
        },
      },
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
