import { writeAudit } from "../../../_lib/db.js";
import { ApiError, errorResponse, json, requireSameOrigin } from "../../../_lib/http.js";

export async function onRequestDelete({ request, env, data, params }) {
  try {
    requireSameOrigin(request);

    const email = decodeURIComponent(String(params.email)).trim().toLowerCase();
    const target = await env.DB
      .prepare("SELECT email, role FROM editors WHERE email = ? COLLATE NOCASE")
      .bind(email)
      .first();
    if (!target) throw new ApiError(404, "That editor no longer exists.", "not_found");
    if (target.email.toLowerCase() === data.editor.email.toLowerCase()) {
      throw new ApiError(400, "Sign in as another administrator to remove this account.", "current_editor");
    }
    const count = await env.DB
      .prepare("SELECT COUNT(*) AS count FROM editors WHERE password_hash IS NOT NULL")
      .first();
    if (Number(count?.count || 0) <= 1) {
      throw new ApiError(400, "The final administrator account cannot be removed.", "final_editor");
    }

    await env.DB
      .prepare("DELETE FROM editor_sessions WHERE editor_email = ? COLLATE NOCASE")
      .bind(email)
      .run();
    await env.DB.prepare("DELETE FROM editors WHERE email = ? COLLATE NOCASE").bind(email).run();
    await writeAudit(env.DB, data.editor.email, "remove", "editor", email);
    return json({ deleted: true, email });
  } catch (error) {
    return errorResponse(error);
  }
}
