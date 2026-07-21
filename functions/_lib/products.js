import { ApiError } from "./http.js";
import { cleanOptionalText, parsePositiveNumber } from "./platform.js";

export const CATEGORIES = new Set([
  "metering",
  "regulators",
  "conversion",
  "valves",
  "hvac",
  "modems",
  "accessories",
  "cabinets",
]);

const IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function declaredImageType(file) {
  const type = String(file?.type || "").toLowerCase().split(";", 1)[0].trim();
  return type === "image/jpg" ? "image/jpeg" : type;
}

export function detectImageType(contents, declaredType = "") {
  const bytes = new Uint8Array(contents.slice(0, 16));
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const isWebp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";

  if (isJpeg) return "image/jpeg";
  if (isPng) return "image/png";
  if (isWebp) return "image/webp";

  const normalizedDeclaredType = declaredType === "image/jpg" ? "image/jpeg" : declaredType;
  return IMAGE_TYPES.has(normalizedDeclaredType) ? normalizedDeclaredType : null;
}

function cleanText(value, label, maxLength) {
  const text = String(value || "").trim();
  if (!text) throw new ApiError(400, `${label} is required.`, "validation_error");
  if (text.length > maxLength) {
    throw new ApiError(400, `${label} is too long.`, "validation_error");
  }
  return text;
}

function splitList(value, maxItems, maxItemLength) {
  const items = String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (items.length > maxItems || items.some((item) => item.length > maxItemLength)) {
    throw new ApiError(400, "One of the product lists is too long.", "validation_error");
  }
  return [...new Set(items)];
}

export function parseProductForm(formData) {
  const category = cleanText(formData.get("category"), "Category", 40);
  if (!CATEGORIES.has(category)) {
    throw new ApiError(400, "Choose a valid product category.", "validation_error");
  }

  return {
    name: cleanText(formData.get("name"), "Product name", 240),
    brand: cleanText(formData.get("brand"), "Brand", 80),
    category,
    summary: cleanText(formData.get("summary"), "Description", 5000),
    specs: splitList(formData.get("specs"), 20, 1000),
    tags: splitList(formData.get("tags"), 15, 100),
  };
}

export function parseProductDetails(formData, productName) {
  const thresholdValue = String(formData.get("lowStockThreshold") || "").trim();
  const lowStockThreshold = thresholdValue
    ? parsePositiveNumber(thresholdValue, { max: 1_000_000_000 })
    : null;
  if (thresholdValue && lowStockThreshold === null) {
    throw new ApiError(400, "Enter a valid low-stock threshold.", "invalid_threshold");
  }
  const publicationStatus = formData.get("publicationStatus") === "draft"
    ? "draft"
    : "published";
  const overrideStatuses = new Set([
    "in_stock",
    "low_stock",
    "out_of_stock",
    "contact",
    "unavailable",
  ]);
  const requestedOverride = String(formData.get("availabilityOverride") || "").trim();
  const availabilityOverride = overrideStatuses.has(requestedOverride) ? requestedOverride : "";
  const overrideReason = cleanOptionalText(formData.get("overrideReason"), 500);
  if (availabilityOverride && !overrideReason) {
    throw new ApiError(
      400,
      "Explain why the inventory availability is being overridden.",
      "override_reason_required",
    );
  }
  const rawOverrideExpiry = cleanOptionalText(formData.get("overrideExpiresAt"), 40);
  let overrideExpiresAt = null;
  if (rawOverrideExpiry) {
    const parsedExpiry = new Date(rawOverrideExpiry);
    if (Number.isNaN(parsedExpiry.getTime())) {
      throw new ApiError(400, "Choose a valid override expiration date.", "invalid_override_expiry");
    }
    overrideExpiresAt = parsedExpiry.toISOString();
  }
  return {
    model: cleanOptionalText(formData.get("model"), 140),
    sku: cleanOptionalText(formData.get("sku"), 120),
    internalId: cleanOptionalText(formData.get("internalId"), 120),
    applications: splitList(formData.get("applications"), 30, 600),
    lowStockThreshold,
    publicQuantity: ["1", "true", "on", "yes"].includes(
      String(formData.get("publicQuantity") || "").toLowerCase(),
    ),
    availabilityOverride,
    overrideReason: availabilityOverride ? overrideReason : "",
    overrideExpiresAt: availabilityOverride ? overrideExpiresAt : null,
    publicationStatus,
    requestedSlug: slugify(cleanOptionalText(formData.get("slug"), 100) || productName),
    seoTitle: cleanOptionalText(formData.get("seoTitle"), 160),
    seoDescription: cleanOptionalText(formData.get("seoDescription"), 320),
  };
}

const PRODUCT_LANGUAGES = new Set(["az", "en", "tr", "ru", "ka"]);

export function parseTranslationOverrides(formData) {
  const raw = String(formData.get("translationOverrides") || "").trim();
  if (!raw) return {};

  let values;
  try {
    values = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "Product translations are invalid.", "validation_error");
  }
  if (!values || Array.isArray(values) || typeof values !== "object") {
    throw new ApiError(400, "Product translations are invalid.", "validation_error");
  }

  return Object.fromEntries(
    Object.entries(values).map(([language, translation]) => {
      if (!PRODUCT_LANGUAGES.has(language) || !translation || typeof translation !== "object") {
        throw new ApiError(400, "Product translations are invalid.", "validation_error");
      }
      return [
        language,
        {
          name: cleanText(translation.name, "Translated product name", 240),
          summary: cleanText(translation.summary, "Translated description", 5000),
          specs: splitList(Array.isArray(translation.specs) ? translation.specs.join("\n") : translation.specs, 20, 1000),
          tags: splitList(Array.isArray(translation.tags) ? translation.tags.join("\n") : translation.tags, 15, 100),
        },
      ];
    }),
  );
}

export function completeTranslatedProduct(formData, translations) {
  if (![...PRODUCT_LANGUAGES].every((language) => translations[language])) return null;
  const requestedSourceLanguage = String(formData.get("sourceLanguage") || "").trim();
  return {
    sourceLanguage: PRODUCT_LANGUAGES.has(requestedSourceLanguage)
      ? requestedSourceLanguage
      : "az",
    translations,
  };
}

export function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "product";
}

export async function uniqueProductId(db, name) {
  const base = slugify(name);
  let id = base;
  let suffix = 2;
  while (await db.prepare("SELECT id FROM products WHERE id = ?").bind(id).first()) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}

export async function uniqueProductSlug(db, requestedSlug, excludeProductId = null) {
  const base = slugify(requestedSlug);
  let slug = base;
  let suffix = 2;
  while (true) {
    const existing = await db
      .prepare("SELECT product_id FROM product_catalog_details WHERE slug = ?")
      .bind(slug)
      .first();
    if (!existing || existing.product_id === excludeProductId) return slug;
    slug = `${base.slice(0, 58)}-${suffix}`;
    suffix += 1;
  }
}

export function productDetailsStatement(db, productId, details, slug, updatedAt, updatedBy) {
  return db
    .prepare(
      `INSERT INTO product_catalog_details (
         product_id, model, sku, internal_id, applications_json,
         datasheets_json, certificates_json, related_products_json,
         low_stock_threshold, public_quantity, availability_override,
         override_reason, override_expires_at, publication_status,
         slug, seo_title, seo_description, updated_at, updated_by
       ) VALUES (?, ?, ?, ?, ?, '[]', '[]', '[]', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(product_id) DO UPDATE SET
         model = excluded.model, sku = excluded.sku, internal_id = excluded.internal_id,
         applications_json = excluded.applications_json,
         low_stock_threshold = excluded.low_stock_threshold,
         public_quantity = excluded.public_quantity,
         availability_override = excluded.availability_override,
         override_reason = excluded.override_reason,
         override_expires_at = excluded.override_expires_at,
         publication_status = excluded.publication_status,
         slug = excluded.slug, seo_title = excluded.seo_title,
         seo_description = excluded.seo_description,
         updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
    )
    .bind(
      productId,
      details.model,
      details.sku,
      details.internalId,
      JSON.stringify(details.applications),
      details.lowStockThreshold,
      details.publicQuantity ? 1 : 0,
      details.availabilityOverride,
      details.overrideReason,
      details.overrideExpiresAt,
      details.publicationStatus,
      slug,
      details.seoTitle,
      details.seoDescription,
      updatedAt,
      updatedBy,
    );
}

export function inventoryAvailabilityStatement(db, productId, threshold) {
  return db
    .prepare(
      `UPDATE product_inventory
       SET availability_status = CASE
         WHEN data_status = 'unavailable' THEN 'unavailable'
         WHEN data_status != 'current' OR quantity IS NULL THEN 'contact'
         WHEN quantity <= 0 THEN 'out_of_stock'
         WHEN ? IS NOT NULL AND quantity <= ? THEN 'low_stock'
         ELSE 'in_stock'
       END
       WHERE product_id = ?`,
    )
    .bind(threshold, threshold, productId);
}

export async function storeImage(db, file, productId) {
  if (!file || typeof file.arrayBuffer !== "function" || !file.size) {
    throw new ApiError(400, "Choose a product photo.", "image_required");
  }
  if (file.size > 1_500_000) {
    throw new ApiError(413, "The optimized product photo must be smaller than 1.5 MB.", "image_too_large");
  }

  const contents = await file.arrayBuffer();
  const contentType = detectImageType(contents, declaredImageType(file));
  if (!contentType) {
    throw new ApiError(415, "The selected file is not a valid product photo.", "invalid_image");
  }
  const extension = IMAGE_TYPES.get(contentType);

  const key = `${productId}-${crypto.randomUUID()}.${extension}`;
  await db
    .prepare(
      `INSERT INTO product_images (
         image_key, content_type, body, byte_size, product_id, created_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(key, contentType, contents, file.size, productId, new Date().toISOString())
    .run();
  return { key, url: `/media/${key}` };
}

export function mediaKeyFromUrl(imageUrl) {
  return String(imageUrl || "").startsWith("/media/")
    ? String(imageUrl).slice("/media/".length)
    : null;
}
