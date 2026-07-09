import { writeAudit } from "../../../_lib/db.js";
import { ApiError, errorResponse, json, requireSameOrigin } from "../../../_lib/http.js";

export async function onRequestDelete({ request, env, data, params }) {
  try {
    requireSameOrigin(request);
    if (data.editor.role !== "owner") {
      throw new ApiError(403, "Only owners can remove editors.", "owner_required");
    }

    const email = decodeURIComponent(String(params.email)).trim().toLowerCase();
    const target = await env.DB
      .prepare("SELECT email, role FROM editors WHERE email = ? COLLATE NOCASE")
      .bind(email)
      .first();
    if (!target) throw new ApiError(404, "That editor no longer exists.", "not_found");
    if (target.role === "owner") {
      throw new ApiError(400, "The two account owners cannot be removed here.", "protected_owner");
    }

    await env.DB.prepare("DELETE FROM editors WHERE email = ? COLLATE NOCASE").bind(email).run();
    await writeAudit(env.DB, data.editor.email, "remove", "editor", email);
    return json({ deleted: true, email });
  } catch (error) {
    return errorResponse(error);
  }
}
