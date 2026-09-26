import {
  ApiError,
  errorResponse,
  json,
  readJson,
  requireSameOrigin,
} from "../../../_lib/http.js";
import { cleanOptionalText, requirePermission } from "../../../_lib/platform.js";

const STATUSES = new Set([
  "new",
  "under_review",
  "information_required",
  "preparing_quotation",
  "quoted",
  "accepted",
  "rejected",
  "completed",
  "archived",
]);

export async function onRequestGet({ env, data, params }) {
  try {
    requirePermission(data.editor, "quotes");
    const id = String(params.id);
    const [quote, items, events] = await Promise.all([
      env.DB.prepare("SELECT * FROM quotation_requests WHERE id = ?").bind(id).first(),
      env.DB
        .prepare(
          `SELECT qi.*, i.availability_status AS current_inventory_status,
                  COALESCE(d.availability_override, '') AS availability_override,
                  d.override_expires_at, i.report_month AS current_report_month,
                  i.report_year AS current_report_year
           FROM quotation_items qi
           LEFT JOIN product_inventory i ON i.product_id = qi.product_id
           LEFT JOIN product_catalog_details d ON d.product_id = qi.product_id
           WHERE qi.quotation_id = ? ORDER BY qi.id`,
        )
        .bind(id)
        .all(),
      env.DB.prepare("SELECT * FROM quotation_events WHERE quotation_id = ? ORDER BY created_at DESC").bind(id).all(),
    ]);
    if (!quote) throw new ApiError(404, "This quotation was not found.", "not_found");
    return json({
      quote: {
        id: quote.id,
        reference: quote.reference,
        enquiryType: quote.enquiry_type,
        language: quote.language,
        customerName: quote.customer_name,
        companyName: quote.company_name,
        email: quote.email,
        phone: quote.phone,
        preferredContact: quote.preferred_contact,
        projectLocation: quote.project_location,
        timeline: quote.timeline,
        message: quote.message,
        status: quote.status,
        assignedTo: quote.assigned_to,
        createdAt: quote.created_at,
        updatedAt: quote.updated_at,
      },
      items: items.results.map((item) => {
        const overrideActive = Boolean(
          item.availability_override
            && (!item.override_expires_at || new Date(item.override_expires_at).getTime() > Date.now()),
        );
        return {
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity === null ? null : Number(item.quantity),
          requirements: item.requirements,
          inventoryStatusAtSubmission: item.inventory_status_at_submission,
          inventoryReportMonthAtSubmission: item.inventory_report_month,
          inventoryReportYearAtSubmission: item.inventory_report_year,
          currentInventoryStatus: overrideActive
            ? item.availability_override
            : item.current_inventory_status || "unavailable",
          currentReportMonth: item.current_report_month,
          currentReportYear: item.current_report_year,
        };
      }),
      events: events.results.map((event) => ({
        id: event.id,
        actorEmail: event.actor_email,
        eventType: event.event_type,
        fromStatus: event.from_status,
        toStatus: event.to_status,
        note: event.note,
        createdAt: event.created_at,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPatch({ request, env, data, params }) {
  try {
    requireSameOrigin(request);
    requirePermission(data.editor, "quotes");
    const id = String(params.id);
    const body = await readJson(request);
    const status = String(body.status || "");
    if (!STATUSES.has(status)) {
      throw new ApiError(400, "Choose a valid quotation status.", "invalid_status");
    }
    const existing = await env.DB
      .prepare("SELECT status FROM quotation_requests WHERE id = ?")
      .bind(id)
      .first();
    if (!existing) throw new ApiError(404, "This quotation was not found.", "not_found");
    const note = cleanOptionalText(body.note, 1000);
    const assignedTo = cleanOptionalText(body.assignedTo, 254) || null;
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB
        .prepare(
          `UPDATE quotation_requests SET status = ?, assigned_to = ?, updated_at = ? WHERE id = ?`,
        )
        .bind(status, assignedTo, now, id),
      env.DB
        .prepare(
          `INSERT INTO quotation_events (
             quotation_id, actor_email, event_type, from_status, to_status, note, created_at
           ) VALUES (?, ?, 'status_changed', ?, ?, ?, ?)`,
        )
        .bind(id, data.editor.email, existing.status, status, note, now),
    ]);
    return json({ id, status, assignedTo, updatedAt: now });
  } catch (error) {
    return errorResponse(error);
  }
}
