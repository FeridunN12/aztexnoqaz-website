import { ensureEditors, INITIAL_OWNERS } from "../_lib/db.js";
import { json } from "../_lib/http.js";

export async function onRequestGet({ env }) {
  try {
    await ensureEditors(env.DB);
    const result = await env.DB
      .prepare(
        `SELECT
           email,
           role,
           display_name AS displayName,
           password_salt AS passwordSalt,
           password_hash AS passwordHash,
           password_iterations AS passwordIterations,
           updated_at AS updatedAt
         FROM editors
         WHERE email IN (?, ?)
         ORDER BY email`,
      )
      .bind(INITIAL_OWNERS[0].email, INITIAL_OWNERS[1].email)
      .all();

    return json({
      version: "2026-07-10-editor-diagnostics",
      owners: result.results.map((owner) => ({
        email: owner.email,
        role: owner.role,
        displayName: owner.displayName,
        hasPassword: Boolean(owner.passwordHash),
        saltLength: String(owner.passwordSalt || "").length,
        hashLength: String(owner.passwordHash || "").length,
        passwordIterations: owner.passwordIterations,
        updatedAt: owner.updatedAt,
      })),
    });
  } catch (error) {
    return json(
      {
        version: "2026-07-10-editor-diagnostics",
        error: String(error?.message || error).slice(0, 300),
      },
      500,
    );
  }
}
