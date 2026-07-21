import { errorResponse, json } from "../../_lib/http.js";
import { requirePermission } from "../../_lib/platform.js";

export async function onRequestGet({ env, data }) {
  try {
    requirePermission(data.editor, "inventory");
    const configured = Boolean(
      String(env.INVENTORY_CONNECTOR_URL || "").trim() &&
      String(env.INVENTORY_CONNECTOR_TOKEN || "").trim(),
    );
    const record = await env.DB
      .prepare("SELECT * FROM inventory_connectors ORDER BY updated_at DESC LIMIT 1")
      .first();
    return json({
      manualUpload: {
        enabled: true,
        label: "Secure monthly .xlsx upload",
      },
      connectedWorkbook: {
        configured,
        status: configured ? record?.status || "ready" : "not_configured",
        displayName: record?.display_name || null,
        lastCheckedAt: record?.last_checked_at || null,
        lastChangedAt: record?.last_changed_at || null,
        lastImportId: record?.last_import_id || null,
        lastError: record?.last_error || null,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
