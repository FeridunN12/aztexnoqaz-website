import { writeAudit } from "../../../../_lib/db.js";
import { errorResponse, json, requireSameOrigin } from "../../../../_lib/http.js";
import { rollbackInventoryImport } from "../../../../_lib/inventory.js";
import { requirePermission } from "../../../../_lib/platform.js";

export async function onRequestPost({ request, env, data, params }) {
  try {
    requireSameOrigin(request);
    requirePermission(data.editor, "inventory");
    const id = String(params.id);
    const result = await rollbackInventoryImport(env.DB, id);
    await writeAudit(env.DB, data.editor.email, "rollback", "inventory_import", id);
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
