import { errorResponse, json } from "../../_lib/http.js";
import { hasPermission, requirePermission } from "../../_lib/platform.js";

export async function onRequestGet({ env, data }) {
  try {
    requirePermission(data.editor, "view");
    const canViewInventory = hasPermission(data.editor, "inventory");
    const [catalog, quotes, recentQuotes] = await Promise.all([
      env.DB
        .prepare(
          `SELECT COUNT(*) AS products, COUNT(DISTINCT brand) AS brands,
                  SUM(CASE WHEN COALESCE(d.publication_status, 'published') = 'published' THEN 1 ELSE 0 END) AS published
           FROM products p LEFT JOIN product_catalog_details d ON d.product_id = p.id`,
        )
        .first(),
      env.DB
        .prepare(
          `SELECT COUNT(*) AS total,
                  SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS new_count,
                  SUM(CASE WHEN status IN ('under_review', 'information_required', 'preparing_quotation') THEN 1 ELSE 0 END) AS in_progress,
                  SUM(CASE WHEN status = 'quoted' THEN 1 ELSE 0 END) AS quoted,
                  SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS accepted,
                  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
           FROM quotation_requests`,
        )
        .first(),
      env.DB
        .prepare(
          `SELECT q.id, q.reference, q.customer_name, q.company_name, q.status, q.created_at,
                  GROUP_CONCAT(qi.product_name, ', ') AS products
           FROM quotation_requests q
           LEFT JOIN quotation_items qi ON qi.quotation_id = q.id
           GROUP BY q.id ORDER BY q.created_at DESC LIMIT 8`,
        )
        .all(),
    ]);

    let inventory = null;
    let latestReport = null;
    let importHistory = [];
    if (canViewInventory) {
      const [inventoryRow, latestReportRow, imports] = await Promise.all([
        env.DB
          .prepare(
            `SELECT COUNT(i.product_id) AS tracked,
                    SUM(CASE WHEN i.availability_status = 'in_stock' THEN 1 ELSE 0 END) AS in_stock,
                    SUM(CASE WHEN i.availability_status = 'low_stock' THEN 1 ELSE 0 END) AS low_stock,
                    SUM(CASE WHEN i.availability_status = 'out_of_stock' THEN 1 ELSE 0 END) AS out_of_stock,
                    SUM(CASE WHEN i.availability_status IN ('contact', 'unavailable') THEN 1 ELSE 0 END) AS unavailable,
                    SUM(CASE WHEN EXISTS (
                      SELECT 1 FROM inventory_mappings m WHERE m.product_id = p.id
                    ) THEN 1 ELSE 0 END) AS mapped,
                    SUM(CASE WHEN NOT EXISTS (
                      SELECT 1 FROM inventory_mappings m WHERE m.product_id = p.id
                    ) THEN 1 ELSE 0 END) AS unmapped
             FROM products p LEFT JOIN product_inventory i ON i.product_id = p.id`,
          )
          .first(),
        env.DB
          .prepare(
            `SELECT id, report_month, report_year, source_name, applied_at,
                    created_by, file_name, unmatched_rows, ambiguous_rows, invalid_rows
             FROM inventory_imports WHERE status = 'applied'
             ORDER BY applied_at DESC LIMIT 1`,
          )
          .first(),
        env.DB
          .prepare(
            `SELECT id, report_month, report_year, mapped_rows, changed_products, applied_at
             FROM inventory_imports WHERE status = 'applied'
             ORDER BY applied_at ASC LIMIT 18`,
          )
          .all(),
      ]);
      inventory = {
        tracked: Number(inventoryRow?.tracked || 0),
        inStock: Number(inventoryRow?.in_stock || 0),
        lowStock: Number(inventoryRow?.low_stock || 0),
        outOfStock: Number(inventoryRow?.out_of_stock || 0),
        unavailable: Number(inventoryRow?.unavailable || 0),
        mapped: Number(inventoryRow?.mapped || 0),
        unmapped: Number(inventoryRow?.unmapped || 0),
      };
      latestReport = latestReportRow
        ? {
            id: latestReportRow.id,
            month: Number(latestReportRow.report_month),
            year: Number(latestReportRow.report_year),
            source: latestReportRow.source_name,
            appliedAt: latestReportRow.applied_at,
            importedBy: latestReportRow.created_by,
            fileName: latestReportRow.file_name,
            unmatchedRows: Number(latestReportRow.unmatched_rows || 0),
            ambiguousRows: Number(latestReportRow.ambiguous_rows || 0),
            invalidRows: Number(latestReportRow.invalid_rows || 0),
            stale: (() => {
              const reportDate = Date.UTC(
                Number(latestReportRow.report_year),
                Number(latestReportRow.report_month) - 1,
                1,
              );
              const currentMonth = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1);
              return currentMonth - reportDate > 45 * 24 * 60 * 60 * 1000;
            })(),
          }
        : null;
      importHistory = imports.results.map((row) => ({
        id: row.id,
        month: Number(row.report_month),
        year: Number(row.report_year),
        mappedRows: Number(row.mapped_rows || 0),
        changedProducts: Number(row.changed_products || 0),
        appliedAt: row.applied_at,
      }));
    }

    return json({
      catalog: {
        products: Number(catalog?.products || 0),
        published: Number(catalog?.published || 0),
        brands: Number(catalog?.brands || 0),
      },
      inventory,
      quotes: {
        total: Number(quotes?.total || 0),
        new: Number(quotes?.new_count || 0),
        inProgress: Number(quotes?.in_progress || 0),
        quoted: Number(quotes?.quoted || 0),
        accepted: Number(quotes?.accepted || 0),
        completed: Number(quotes?.completed || 0),
      },
      latestReport,
      importHistory,
      recentQuotes: recentQuotes.results.map((row) => ({
        id: row.id,
        reference: row.reference,
        customerName: row.customer_name,
        companyName: row.company_name,
        products: row.products || "",
        status: row.status,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
