import { writeAudit } from "../../../_lib/db.js";
import {
  ApiError,
  errorResponse,
  json,
  readJson,
  requireSameOrigin,
} from "../../../_lib/http.js";
import { getImportPreview, updateImportMapping } from "../../../_lib/inventory.js";
import { requirePermission } from "../../../_lib/platform.js";

export async function onRequestGet({ env, data, params }) {
  try {
    requirePermission(data.editor, "inventory");
    return json(await getImportPreview(env.DB, String(params.id)));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPatch({ request, env, data, params }) {
  try {
    requireSameOrigin(request);
    requirePermission(data.editor, "inventory");
    const body = await readJson(request);
    const rowNumber = Number(body.rowNumber);
    if (!Number.isInteger(rowNumber) || rowNumber < 1) {
      throw new ApiError(400, "Choose a valid workbook row.", "invalid_row");
    }
    const action = ["map", "ignore", "clear"].includes(body.action) ? body.action : "map";
    return json(
      await updateImportMapping(
        env.DB,
        String(params.id),
        rowNumber,
        action,
        String(body.productId || ""),
        data.editor.email,
      ),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestDelete({ request, env, data, params }) {
  try {
    requireSameOrigin(request);
    requirePermission(data.editor, "inventory");
    const id = String(params.id);
    const result = await env.DB
      .prepare("UPDATE inventory_imports SET status = 'cancelled' WHERE id = ? AND status = 'preview'")
      .bind(id)
      .run();
    if (!Number(result.meta?.changes || 0)) {
      throw new ApiError(409, "Only an active preview can be cancelled.", "import_locked");
    }
    await writeAudit(env.DB, data.editor.email, "cancel", "inventory_import", id);
    return json({ cancelled: true });
  } catch (error) {
    return errorResponse(error);
  }
}
