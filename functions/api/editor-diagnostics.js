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

    const expectedByEmail = new Map(
      INITIAL_OWNERS.map((owner) => [owner.email.toLowerCase(), owner.password]),
    );

    return json({
      version: "2026-07-10-editor-diagnostics",
      owners: result.results.map((owner) => {
        const expected = expectedByEmail.get(String(owner.email || "").toLowerCase());
        return {
          email: owner.email,
          role: owner.role,
          displayName: owner.displayName,
          hasPassword: Boolean(owner.passwordHash),
          saltLength: String(owner.passwordSalt || "").length,
          hashLength: String(owner.passwordHash || "").length,
          passwordIterations: owner.passwordIterations,
          saltMatchesSeed: owner.passwordSalt === expected?.salt,
          hashMatchesSeed: owner.passwordHash === expected?.hash,
          iterationsMatchSeed: Number(owner.passwordIterations) === expected?.iterations,
          updatedAt: owner.updatedAt,
        };
      }),
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
