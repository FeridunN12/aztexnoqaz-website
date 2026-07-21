import { ApiError, errorResponse } from "../../../../_lib/http.js";
import { requirePermission } from "../../../../_lib/platform.js";

function safeCsvValue(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function onRequestGet({ env, data, params }) {
  try {
    requirePermission(data.editor, "inventory");
    const id = String(params.id);
    const record = await env.DB
      .prepare("SELECT id, report_month, report_year FROM inventory_imports WHERE id = ?")
      .bind(id)
      .first();
    if (!record) throw new ApiError(404, "This inventory import was not found.", "not_found");

    const result = await env.DB
      .prepare(
        `SELECT row_number, workbook_name, workbook_code, quantity,
                validation_status, mapping_status, warnings_json
         FROM inventory_import_rows
         WHERE import_id = ? AND (
           validation_status = 'invalid' OR mapping_status IN ('unmatched', 'ambiguous')
           OR warnings_json <> '[]'
         )
         ORDER BY row_number`,
      )
      .bind(id)
      .all();
    const header = [
      "Workbook row",
      "Product name",
      "Product code",
      "Final quantity",
      "Validation status",
      "Mapping status",
      "Warnings",
    ];
    const lines = [header, ...result.results.map((row) => [
      row.row_number,
      row.workbook_name,
      row.workbook_code,
      row.quantity,
      row.validation_status,
      row.mapping_status,
      (() => {
        try { return JSON.parse(row.warnings_json || "[]").join("; "); }
        catch { return "Could not read warning details"; }
      })(),
    ])].map((row) => row.map(safeCsvValue).join(","));

    const filename = `inventory-review-${record.report_year}-${String(record.report_month).padStart(2, "0")}.csv`;
    return new Response(`\uFEFF${lines.join("\r\n")}`, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "text/csv; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
