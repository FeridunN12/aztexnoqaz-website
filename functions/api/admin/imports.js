import { errorResponse, json } from "../../_lib/http.js";
import { listInventoryImports } from "../../_lib/inventory.js";
import { requirePermission } from "../../_lib/platform.js";

export async function onRequestGet({ env, data }) {
  try {
    requirePermission(data.editor, "inventory");
    return json({ imports: await listInventoryImports(env.DB) });
  } catch (error) {
    return errorResponse(error);
  }
}
