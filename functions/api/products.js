import { listProducts } from "../_lib/db.js";
import { errorResponse, json } from "../_lib/http.js";

export async function onRequestGet({ env }) {
  try {
    if (!env.DB) throw new Error("Missing DB binding");
    const products = await listProducts(env.DB);
    const latestReport = await env.DB
      .prepare(
        `SELECT report_month, report_year, applied_at, source_type, source_name
         FROM inventory_imports WHERE status = 'applied'
         ORDER BY applied_at DESC LIMIT 1`,
      )
      .first();
    return json({
      products,
      catalog: {
        productCount: products.length,
        brandCount: new Set(products.map((product) => product.brand).filter(Boolean)).size,
        trackedProductCount: products.filter((product) => product.availability.dataStatus !== "unavailable").length,
        latestReport: latestReport
          ? {
              month: Number(latestReport.report_month),
              year: Number(latestReport.report_year),
              appliedAt: latestReport.applied_at,
              sourceType: latestReport.source_type,
              sourceName: latestReport.source_name,
            }
          : null,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
