import { errorResponse, json } from "../../_lib/http.js";
import { requirePermission } from "../../_lib/platform.js";

export async function onRequestGet({ env, data }) {
  try {
    requirePermission(data.editor, "view");
    const [catalog, inventory, quotes, latestReport, imports, recentQuotes] = await Promise.all([
      env.DB
        .prepare(
          `SELECT COUNT(*) AS products, COUNT(DISTINCT brand) AS brands,
                  SUM(CASE WHEN COALESCE(d.publication_status, 'published') = 'published' THEN 1 ELSE 0 END) AS published
           FROM products p LEFT JOIN product_catalog_details d ON d.product_id = p.id`,
        )
        .first(),
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
    return json({
      catalog: {
        products: Number(catalog?.products || 0),
        published: Number(catalog?.published || 0),
        brands: Number(catalog?.brands || 0),
      },
      inventory: {
        tracked: Number(inventory?.tracked || 0),
        inStock: Number(inventory?.in_stock || 0),
        lowStock: Number(inventory?.low_stock || 0),
        outOfStock: Number(inventory?.out_of_stock || 0),
        unavailable: Number(inventory?.unavailable || 0),
        mapped: Number(inventory?.mapped || 0),
        unmapped: Number(inventory?.unmapped || 0),
      },
      quotes: {
        total: Number(quotes?.total || 0),
        new: Number(quotes?.new_count || 0),
        inProgress: Number(quotes?.in_progress || 0),
        quoted: Number(quotes?.quoted || 0),
        accepted: Number(quotes?.accepted || 0),
        completed: Number(quotes?.completed || 0),
      },
      latestReport: latestReport
        ? {
            id: latestReport.id,
            month: Number(latestReport.report_month),
            year: Number(latestReport.report_year),
            source: latestReport.source_name,
            appliedAt: latestReport.applied_at,
            importedBy: latestReport.created_by,
            fileName: latestReport.file_name,
            unmatchedRows: Number(latestReport.unmatched_rows || 0),
            ambiguousRows: Number(latestReport.ambiguous_rows || 0),
            invalidRows: Number(latestReport.invalid_rows || 0),
            stale: (() => {
              const reportDate = Date.UTC(Number(latestReport.report_year), Number(latestReport.report_month) - 1, 1);
              const currentMonth = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1);
              return currentMonth - reportDate > 45 * 24 * 60 * 60 * 1000;
            })(),
          }
        : null,
      importHistory: imports.results.map((row) => ({
        id: row.id,
        month: Number(row.report_month),
        year: Number(row.report_year),
        mappedRows: Number(row.mapped_rows || 0),
        changedProducts: Number(row.changed_products || 0),
        appliedAt: row.applied_at,
      })),
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
