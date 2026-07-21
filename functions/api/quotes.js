import { ensureCatalog } from "../_lib/db.js";
import {
  ApiError,
  errorResponse,
  json,
  readJson,
  requireSameOrigin,
} from "../_lib/http.js";
import {
  cleanOptionalText,
  cleanRequiredText,
  ensurePlatformSchema,
  parsePositiveNumber,
  randomId,
  sha256Hex,
} from "../_lib/platform.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LANGUAGES = new Set(["az", "en", "tr", "ru", "ka"]);
const TYPES = new Set(["quotation", "technical", "general"]);
const CONTACT_METHODS = new Set(["phone", "whatsapp", "email"]);
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 6;

async function referenceNumber(db) {
  const now = new Date();
  const month = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const number = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
    const reference = `AZQ-${month}-${String(number).padStart(6, "0")}`;
    const existing = await db
      .prepare("SELECT id FROM quotation_requests WHERE reference = ?")
      .bind(reference)
      .first();
    if (!existing) return reference;
  }
  throw new ApiError(503, "A quotation reference could not be generated.", "reference_unavailable");
}

async function rateLimit(db, request) {
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const key = await sha256Hex(`quote|${ip}`);
  const row = await db
    .prepare("SELECT attempts, window_started_at FROM quotation_rate_limits WHERE rate_key = ?")
    .bind(key)
    .first();
  const now = new Date();
  const expired = !row || now.getTime() - new Date(row.window_started_at).getTime() >= RATE_WINDOW_MS;
  if (!expired && Number(row.attempts) >= MAX_REQUESTS) {
    throw new ApiError(429, "Too many requests were submitted. Please try again later.", "rate_limited");
  }
  return {
    key,
    attempts: expired ? 1 : Number(row.attempts) + 1,
    windowStartedAt: expired ? now.toISOString() : row.window_started_at,
  };
}

export async function onRequestPost({ request, env }) {
  try {
    requireSameOrigin(request);
    await ensureCatalog(env.DB);
    await ensurePlatformSchema(env.DB);
    const body = await readJson(request);
    if (body.website) return json({ accepted: true }, 202);
    const customerName = cleanRequiredText(body.customerName, "Name or company", 120);
    const companyName = cleanOptionalText(body.companyName, 160);
    const email = cleanOptionalText(body.email, 254).toLowerCase();
    const phone = cleanOptionalText(body.phone, 60);
    if (!email && !phone) {
      throw new ApiError(400, "Enter a phone number or email address.", "contact_required");
    }
    if (email && !EMAIL_PATTERN.test(email)) {
      throw new ApiError(400, "Enter a valid email address.", "invalid_email");
    }
    const enquiryType = TYPES.has(body.enquiryType) ? body.enquiryType : "quotation";
    const preferredContact = CONTACT_METHODS.has(body.preferredContact)
      ? body.preferredContact
      : phone
        ? "phone"
        : "email";
    const language = LANGUAGES.has(body.language) ? body.language : "az";
    const message = cleanOptionalText(body.message, 5000);
    const projectLocation = cleanOptionalText(body.projectLocation, 180);
    const timeline = cleanOptionalText(body.timeline, 120);
    const submittedItems = Array.isArray(body.items) && body.items.length
      ? body.items
      : [{
          productId: body.productId,
          quantity: body.quantity,
          requirements: body.requirements,
        }];
    if (submittedItems.length > 20) {
      throw new ApiError(400, "A quotation can contain up to 20 products.", "too_many_products");
    }
    const items = [];
    const seenProducts = new Set();
    for (const submittedItem of submittedItems) {
      const productId = cleanOptionalText(submittedItem?.productId, 100);
      if (productId && seenProducts.has(productId)) {
        throw new ApiError(400, "Each product may appear only once in a quotation.", "duplicate_product");
      }
      if (productId) seenProducts.add(productId);
      const quantity = parsePositiveNumber(submittedItem?.quantity, {
        allowZero: false,
        max: 1_000_000,
      });
      const requirements = cleanOptionalText(submittedItem?.requirements, 2500);
      let productName = "General enquiry";
      let inventoryStatus = "unavailable";
      let reportMonth = null;
      let reportYear = null;
      if (productId) {
        const product = await env.DB
          .prepare(
            `SELECT p.id, p.name, i.availability_status, i.report_month, i.report_year,
                    COALESCE(d.availability_override, '') AS availability_override,
                    d.override_expires_at
             FROM products p
             LEFT JOIN product_catalog_details d ON d.product_id = p.id
             LEFT JOIN product_inventory i ON i.product_id = p.id
             WHERE p.id = ? AND COALESCE(d.publication_status, 'published') = 'published'`,
          )
          .bind(productId)
          .first();
        if (!product) throw new ApiError(400, "Choose a valid catalogue product.", "invalid_product");
        const overrideActive = Boolean(
          product.availability_override
            && (!product.override_expires_at || new Date(product.override_expires_at).getTime() > Date.now()),
        );
        productName = product.name;
        inventoryStatus = overrideActive
          ? product.availability_override
          : product.availability_status || "contact";
        reportMonth = product.report_month === null ? null : Number(product.report_month);
        reportYear = product.report_year === null ? null : Number(product.report_year);
      }
      items.push({
        productId: productId || null,
        productName,
        quantity,
        requirements,
        inventoryStatus,
        reportMonth,
        reportYear,
      });
    }
    const rate = await rateLimit(env.DB, request);
    const id = randomId("quote");
    const reference = await referenceNumber(env.DB);
    const now = new Date().toISOString();

    await env.DB.batch([
      env.DB
        .prepare(
          `INSERT INTO quotation_requests (
             id, reference, enquiry_type, language, customer_name, company_name,
             email, phone, preferred_contact, project_location, timeline,
             message, status, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
        )
        .bind(
          id,
          reference,
          enquiryType,
          language,
          customerName,
          companyName,
          email,
          phone,
          preferredContact,
          projectLocation,
          timeline,
          message,
          now,
          now,
        ),
      ...items.map((item) => env.DB
        .prepare(
          `INSERT INTO quotation_items (
             quotation_id, product_id, product_name, quantity, requirements,
             inventory_status_at_submission, inventory_report_month, inventory_report_year
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          item.productId,
          item.productName,
          item.quantity,
          item.requirements,
          item.inventoryStatus,
          item.reportMonth,
          item.reportYear,
        )),
      env.DB
        .prepare(
          `INSERT INTO quotation_events (
             quotation_id, actor_email, event_type, to_status, note, created_at
           ) VALUES (?, 'website', 'created', 'new', '', ?)`,
        )
        .bind(id, now),
      env.DB
        .prepare(
          `INSERT INTO quotation_rate_limits (rate_key, attempts, window_started_at)
           VALUES (?, ?, ?)
           ON CONFLICT(rate_key) DO UPDATE SET attempts = excluded.attempts,
             window_started_at = excluded.window_started_at`,
        )
        .bind(rate.key, rate.attempts, rate.windowStartedAt),
    ]);
    return json({
      accepted: true,
      reference,
      status: "new",
      itemCount: items.length,
      createdAt: now,
    }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
