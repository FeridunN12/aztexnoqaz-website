import {
  bootstrapInitialOwnerPassword,
  clearLoginFailures,
  createEditorSession,
  enforceLoginRateLimit,
  recordLoginFailure,
  sessionCookie,
  verifyPassword,
} from "../../_lib/auth.js";
import { ensureEditors, writeAudit } from "../../_lib/db.js";
import { ApiError, errorResponse, json, readJson, requireSameOrigin } from "../../_lib/http.js";
import { ensureStaffProfile } from "../../_lib/platform.js";

const LOGIN_ROUTE_VERSION = "2026-07-10-seeded-owner-passwords";

export async function onRequestPost({ request, env }) {
  try {
    requireSameOrigin(request);
    await ensureEditors(env.DB);
    const body = await readJson(request);
    const email = String(body.email || "").trim().toLowerCase();
    const deviceName = String(body.deviceName || "").trim();
    const attemptKey = await enforceLoginRateLimit(env.DB, request, email);
    const editor = await env.DB
      .prepare(
        `SELECT
           email, role, display_name, password_salt, password_hash, password_iterations
         FROM editors
         WHERE email = ? COLLATE NOCASE`,
      )
      .bind(email)
      .first();

    const passwordMatches =
      editor &&
      ((await verifyPassword(body.password, editor, env.AUTH_PEPPER)) ||
        (await bootstrapInitialOwnerPassword(env.DB, editor, body.password, env)));

    if (!passwordMatches) {
      await recordLoginFailure(env.DB, attemptKey);
      return json(
        { error: "The email or password is incorrect.", code: "invalid_credentials" },
        401,
        { "X-Aztexnogaz-Login-Version": LOGIN_ROUTE_VERSION },
      );
    }

    const session = await createEditorSession(env.DB, request, editor.email, deviceName);
    const platformRole = await ensureStaffProfile(env.DB, editor);
    await clearLoginFailures(env.DB, attemptKey);
    await writeAudit(env.DB, editor.email, "login", "session", deviceName, {
      platform: request.headers.get("Sec-CH-UA-Platform") || null,
    });
    return json(
      {
        editor: {
          email: editor.email,
          role: "owner",
          platformRole,
          displayName: editor.display_name || editor.email,
          deviceName,
        },
      },
      200,
      {
        "Set-Cookie": sessionCookie(session.token),
        "X-Aztexnogaz-Login-Version": LOGIN_ROUTE_VERSION,
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
