import {
  clearLoginFailures,
  createEditorSession,
  enforceLoginRateLimit,
  recordLoginFailure,
  sessionCookie,
  verifyPassword,
} from "../../_lib/auth.js";
import { ensureEditors, writeAudit } from "../../_lib/db.js";
import { ApiError, errorResponse, json, readJson, requireSameOrigin } from "../../_lib/http.js";

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

    if (!editor || !(await verifyPassword(body.password, editor, env.AUTH_PEPPER))) {
      await recordLoginFailure(env.DB, attemptKey);
      throw new ApiError(401, "The email or password is incorrect.", "invalid_credentials");
    }

    const session = await createEditorSession(env.DB, request, editor.email, deviceName);
    await clearLoginFailures(env.DB, attemptKey);
    await writeAudit(env.DB, editor.email, "login", "session", deviceName, {
      platform: request.headers.get("Sec-CH-UA-Platform") || null,
    });
    return json(
      {
        editor: {
          email: editor.email,
          role: "owner",
          displayName: editor.display_name || editor.email,
          deviceName,
        },
      },
      200,
      { "Set-Cookie": sessionCookie(session.token) },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
