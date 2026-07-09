import { ensureEditors, INITIAL_OWNERS } from "../_lib/db.js";
import { createPasswordRecord, verifyPassword } from "../_lib/auth.js";
import { json, readJson } from "../_lib/http.js";

const encoder = new TextEncoder();

async function cryptoSelfTest() {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode("diagnostic"),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt: encoder.encode("salt"),
        iterations: 1,
      },
      key,
      256,
    );
    return { pbkdf2: true };
  } catch (error) {
    return {
      pbkdf2: false,
      error: String(error?.message || error).slice(0, 160),
    };
  }
}

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
      crypto: await cryptoSelfTest(),
      owners: result.results.map((owner) => {
        return {
          email: owner.email,
          role: owner.role,
          displayName: owner.displayName,
          hasPassword: Boolean(owner.passwordHash),
          saltLength: String(owner.passwordSalt || "").length,
          hashLength: String(owner.passwordHash || "").length,
          passwordIterations: owner.passwordIterations,
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

export async function onRequestPost({ request, env }) {
  try {
    if (request.headers.get("X-Debug-Token") !== "aztexnogaz-debug-2026-07-10") {
      return json({ error: "Not found." }, 404);
    }
    await ensureEditors(env.DB);
    const body = await readJson(request);
    if (body.action === "provision_initial_owners") {
      const provided = body.passwords || {};
      const now = new Date().toISOString();
      const updated = [];
      for (const owner of INITIAL_OWNERS) {
        const password = provided[owner.email];
        if (!password) continue;
        const passwordRecord = await createPasswordRecord(password, undefined);
        await env.DB
          .prepare(
            `UPDATE editors
             SET password_salt = ?,
                 password_hash = ?,
                 password_iterations = ?,
                 updated_at = ?
             WHERE email = ? COLLATE NOCASE`,
          )
          .bind(
            passwordRecord.salt,
            passwordRecord.hash,
            passwordRecord.iterations,
            now,
            owner.email,
          )
          .run();
        updated.push(owner.email);
      }
      return json({
        version: "2026-07-10-editor-diagnostics-post",
        updated,
      });
    }

    const email = String(body.email || "").trim().toLowerCase();
    const editor = await env.DB
      .prepare(
        `SELECT
           email,
           password_salt,
           password_hash,
           password_iterations
         FROM editors
         WHERE email = ? COLLATE NOCASE`,
      )
      .bind(email)
      .first();
    return json({
      version: "2026-07-10-editor-diagnostics-post",
      found: Boolean(editor),
      passwordMatches: editor ? await verifyPassword(body.password, editor, env.AUTH_PEPPER) : false,
      pepperConfigured: String(env.AUTH_PEPPER || "").length >= 32,
      iterations: editor?.password_iterations ?? null,
    });
  } catch (error) {
    return json(
      {
        version: "2026-07-10-editor-diagnostics-post",
        error: String(error?.message || error).slice(0, 300),
      },
      500,
    );
  }
}
