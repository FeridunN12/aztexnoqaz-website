import { errorResponse, json } from "../../_lib/http.js";
import { requirePermission } from "../../_lib/platform.js";

function parseJson(value) {
  try {
    return JSON.parse(value || "[]");
  } catch {
    return [];
  }
}

export async function onRequestGet({ env, data }) {
  try {
    requirePermission(data.editor, "view");
    const result = await env.DB
      .prepare(
        `SELECT p.id, p.name, p.image_url, p.brand, p.category, p.updated_at,
                COALESCE(d.internal_id, '') AS internal_id,
                COALESCE(d.sku, '') AS sku, COALESCE(d.model, '') AS model,
                d.low_stock_threshold, COALESCE(d.public_quantity, 0) AS public_quantity,
                COALESCE(d.availability_override, '') AS availability_override,
                COALESCE(d.override_reason, '') AS override_reason,
                d.override_expires_at,
                i.quantity, i.availability_status, i.data_status, i.source_name,
                i.report_month, i.report_year, i.workbook_codes_json,
                i.workbook_names_json, i.mapped_row_count, i.updated_at AS inventory_updated_at,
                imp.status AS import_status, imp.id AS import_id,
                (SELECT COUNT(*) FROM inventory_mappings m WHERE m.product_id = p.id) AS mapping_count
         FROM products p
         LEFT JOIN product_catalog_details d ON d.product_id = p.id
         LEFT JOIN product_inventory i ON i.product_id = p.id
         LEFT JOIN inventory_imports imp ON imp.id = i.source_import_id
         ORDER BY p.name COLLATE NOCASE`,
      )
      .all();
    return json({
      inventory: result.results.map((row) => {
        const overrideActive = Boolean(
          row.availability_override
            && (!row.override_expires_at || new Date(row.override_expires_at).getTime() > Date.now()),
        );
        return {
        productId: row.id,
        product: row.name,
        image: String(row.image_url || "").startsWith("/media/")
          ? `${row.image_url}?v=${encodeURIComponent(row.updated_at)}`
          : row.image_url,
        brand: row.brand,
        category: row.category,
        internalId: row.internal_id,
        sku: row.sku,
        model: row.model,
        quantity: row.quantity === null ? null : Number(row.quantity),
        publicAvailability: overrideActive
          ? row.availability_override
          : row.availability_status || "contact",
        baseAvailability: row.availability_status || "contact",
        dataStatus: row.data_status || "unavailable",
        lowStockThreshold: row.low_stock_threshold === null ? null : Number(row.low_stock_threshold),
        publicQuantity: Boolean(row.public_quantity),
        source: row.source_name || null,
        reportMonth: row.report_month === null ? null : Number(row.report_month),
        reportYear: row.report_year === null ? null : Number(row.report_year),
        updatedAt: row.inventory_updated_at,
        workbookCodes: parseJson(row.workbook_codes_json),
        workbookNames: parseJson(row.workbook_names_json),
        linkedRows: Number(row.mapped_row_count || 0),
        mappingCount: Number(row.mapping_count || 0),
        mappingStatus: Number(row.mapping_count || 0) ? "mapped" : "missing",
        importStatus: row.import_status || "not_imported",
        importId: row.import_id,
        overrideStatus: overrideActive
          ? "active"
          : row.availability_override
            ? "expired"
            : "none",
        overrideValue: row.availability_override || null,
        overrideReason: row.override_reason || null,
        overrideExpiresAt: row.override_expires_at || null,
      };
      }),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
