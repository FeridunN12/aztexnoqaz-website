import { errorResponse } from "../../../_lib/http.js";
import { requirePermission } from "../../../_lib/platform.js";

function safeCsv(value) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function onRequestGet({ env, data }) {
  try {
    requirePermission(data.editor, "inventory");
    const result = await env.DB
      .prepare(
        `SELECT p.id, p.name, p.brand, p.category,
                COALESCE(d.internal_id, '') AS internal_id,
                COALESCE(d.sku, '') AS sku, COALESCE(d.model, '') AS model,
                i.quantity, i.availability_status, i.data_status,
                i.report_month, i.report_year, i.source_name, i.updated_at
         FROM products p
         LEFT JOIN product_catalog_details d ON d.product_id = p.id
         LEFT JOIN product_inventory i ON i.product_id = p.id
         ORDER BY p.name COLLATE NOCASE`,
      )
      .all();
    const headers = [
      "Product", "Internal ID", "SKU", "Model", "Brand", "Category", "Quantity",
      "Availability", "Data status", "Report month", "Report year", "Source", "Updated",
    ];
    const lines = [headers.map(safeCsv).join(",")];
    for (const row of result.results) {
      lines.push([
        row.name, row.internal_id, row.sku, row.model, row.brand, row.category,
        row.quantity, row.availability_status || "contact", row.data_status || "unavailable",
        row.report_month, row.report_year, row.source_name, row.updated_at,
      ].map(safeCsv).join(","));
    }
    return new Response(`\uFEFF${lines.join("\r\n")}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="aztexnogaz-inventory-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
