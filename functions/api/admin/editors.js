import { ensureEditors, writeAudit } from "../../_lib/db.js";
import {
  ApiError,
  errorResponse,
  json,
  readJson,
  requireSameOrigin,
} from "../../_lib/http.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestGet({ env, data }) {
  try {
    if (data.editor.role !== "owner") {
      throw new ApiError(403, "Only owners can manage editor access.", "owner_required");
    }
    await ensureEditors(env.DB);
    const result = await env.DB
      .prepare("SELECT email, role, added_at AS addedAt, added_by AS addedBy FROM editors ORDER BY role DESC, email")
      .all();
    return json({ editors: result.results });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPost({ request, env, data }) {
  try {
    requireSameOrigin(request);
    if (data.editor.role !== "owner") {
      throw new ApiError(403, "Only owners can add editors.", "owner_required");
    }
    const body = await readJson(request);
    const email = String(body.email || "").trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      throw new ApiError(400, "Enter a valid email address.", "invalid_email");
    }

    const now = new Date().toISOString();
    await env.DB
      .prepare(
        `INSERT INTO editors (email, role, added_at, added_by)
         VALUES (?, 'editor', ?, ?)
         ON CONFLICT(email) DO NOTHING`,
      )
      .bind(email, now, data.editor.email)
      .run();
    await writeAudit(env.DB, data.editor.email, "add", "editor", email);
    return json({ editor: { email, role: "editor", addedAt: now, addedBy: data.editor.email } }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
