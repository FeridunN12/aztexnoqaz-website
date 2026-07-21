import { writeAudit } from "../../../../_lib/db.js";
import { ApiError, errorResponse, json, requireSameOrigin } from "../../../../_lib/http.js";
import { confirmInventoryImport } from "../../../../_lib/inventory.js";
import { requirePermission } from "../../../../_lib/platform.js";

export async function onRequestPost({ request, env, data, params }) {
  try {
    requireSameOrigin(request);
    requirePermission(data.editor, "inventory");
    const id = String(params.id);
    const result = await confirmInventoryImport(env.DB, id, data.editor.email);
    await writeAudit(env.DB, data.editor.email, "apply", "inventory_import", id, result.import.summary);
    return json(result);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status >= 500) {
      const id = String(params.id);
      const message = "The import transaction failed. The previous inventory was preserved.";
      await env.DB
        .prepare(
          `UPDATE inventory_imports SET status = 'failed', error_message = ?
           WHERE id = ? AND status = 'preview'`,
        )
        .bind(message, id)
        .run()
        .catch(() => {});
      await writeAudit(env.DB, data.editor?.email || "system", "failed", "inventory_import", id, {
        message,
      });
    }
    return errorResponse(error);
  }
}
