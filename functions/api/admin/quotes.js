import { errorResponse, json } from "../../_lib/http.js";
import { requirePermission } from "../../_lib/platform.js";

export async function onRequestGet({ env, data }) {
  try {
    requirePermission(data.editor, "quotes");
    const result = await env.DB
      .prepare(
        `SELECT q.*, GROUP_CONCAT(qi.product_name, ', ') AS products,
                SUM(COALESCE(qi.quantity, 0)) AS total_quantity
         FROM quotation_requests q
         LEFT JOIN quotation_items qi ON qi.quotation_id = q.id
         GROUP BY q.id ORDER BY q.created_at DESC LIMIT 250`,
      )
      .all();
    return json({
      quotes: result.results.map((row) => ({
        id: row.id,
        reference: row.reference,
        enquiryType: row.enquiry_type,
        language: row.language,
        customerName: row.customer_name,
        companyName: row.company_name,
        email: row.email,
        phone: row.phone,
        preferredContact: row.preferred_contact,
        projectLocation: row.project_location,
        timeline: row.timeline,
        message: row.message,
        products: row.products || "",
        totalQuantity: Number(row.total_quantity || 0) || null,
        status: row.status,
        assignedTo: row.assigned_to,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
