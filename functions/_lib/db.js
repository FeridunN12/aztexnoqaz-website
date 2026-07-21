import initialProducts from "../../data/products.json";
import initialProductTranslations from "../../data/product-translations.json";
import azerbaijaniProductCorrections from "../../data/product-az-corrections.json";
import { availabilityFor } from "./inventory.js";
import { ensurePlatformSchema } from "./platform.js";

const PRODUCT_TRANSLATION_SEED_KEY = "product_translation_seed_20260713_v1";
const AZ_TRANSLATION_CORRECTION_SEED_KEY = "product_az_corrections_20260713_v3";
const REMOVED_LANGUAGE_CLEANUP_KEY = "removed_product_language_fa_20260713_v1";

export const INITIAL_OWNERS = [
  { email: "faridnaghizade7@gmail.com", displayName: "Farid" },
  { email: "kenannaghiyev15@gmail.com", displayName: "Kenan" },
];

export async function ensureEditors(db) {
  const now = new Date().toISOString();
  const statements = [];
  for (const { email, displayName } of INITIAL_OWNERS) {
    statements.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO editors (
             email, role, added_at, added_by, display_name, updated_at
           ) VALUES (?, 'owner', ?, 'system', ?, ?)`,
        )
        .bind(
          email,
          now,
          displayName,
          now,
        ),
      db
        .prepare(
          `UPDATE editors
           SET role = 'owner',
               display_name = ?,
               updated_at = ?
           WHERE email = ? COLLATE NOCASE`,
        )
        .bind(
          displayName,
          now,
          email,
        ),
    );
  }
  await db.batch(statements);
}

export async function ensureCatalog(db) {
  const row = await db.prepare("SELECT COUNT(*) AS count FROM products").first();
  if (Number(row?.count || 0) > 0) return;

  const now = new Date().toISOString();
  await db.batch(
    initialProducts.map((product, index) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO products (
             id, name, brand, category, image_url, summary, specs_json, tags_json,
             sort_order, version, created_at, updated_at, updated_by
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'system')`,
        )
        .bind(
          product.id,
          product.name,
          product.brand,
          product.category,
          product.image,
          product.summary,
          JSON.stringify(product.specs),
          JSON.stringify(product.tags),
          index,
          now,
          now,
        ),
    ),
  );
}

export async function ensureProductTranslations(db) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS product_translations (
         product_id TEXT NOT NULL,
         language TEXT NOT NULL,
         source_language TEXT NOT NULL,
         name TEXT NOT NULL,
         summary TEXT NOT NULL,
         specs_json TEXT NOT NULL,
         tags_json TEXT NOT NULL,
         updated_at TEXT NOT NULL,
         PRIMARY KEY (product_id, language)
       )`,
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS catalog_metadata (
         key TEXT PRIMARY KEY,
         value TEXT NOT NULL,
         updated_at TEXT NOT NULL
       )`,
    )
    .run();

  const removedLanguageMarker = await db
    .prepare("SELECT value FROM catalog_metadata WHERE key = ?")
    .bind(REMOVED_LANGUAGE_CLEANUP_KEY)
    .first();
  if (!removedLanguageMarker) {
    const deleted = await db
      .prepare("DELETE FROM product_translations WHERE language = 'fa'")
      .run();
    const cleanedAt = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO catalog_metadata (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`,
      )
      .bind(
        REMOVED_LANGUAGE_CLEANUP_KEY,
        String(deleted.meta?.changes || 0),
        cleanedAt,
      )
      .run();
  }

  const correctionMarker = await db
    .prepare("SELECT value FROM catalog_metadata WHERE key = ?")
    .bind(AZ_TRANSLATION_CORRECTION_SEED_KEY)
    .first();
  if (!correctionMarker) {
    const productResult = await db.prepare("SELECT id, version FROM products").all();
    const productVersions = new Map(
      productResult.results.map((product) => [product.id, Number(product.version)]),
    );
    const correctedAt = new Date().toISOString();
    const correctionStatements = [];

    azerbaijaniProductCorrections.products.forEach((product) => {
      if (productVersions.get(product.id) !== Number(product.revision)) return;
      const translation = product.translation;
      correctionStatements.push(
        db
          .prepare(
            `INSERT INTO product_translations (
               product_id, language, source_language, name, summary,
               specs_json, tags_json, updated_at
             ) VALUES (?, 'az', 'en', ?, ?, ?, ?, ?)
             ON CONFLICT(product_id, language) DO UPDATE SET
               name = excluded.name,
               summary = excluded.summary,
               specs_json = excluded.specs_json,
               tags_json = excluded.tags_json,
               updated_at = excluded.updated_at`,
          )
          .bind(
            product.id,
            translation.name,
            translation.summary,
            JSON.stringify(translation.specs),
            JSON.stringify(translation.tags),
            correctedAt,
          ),
      );
    });

    if (correctionStatements.length) await db.batch(correctionStatements);
    await db
      .prepare(
        `INSERT INTO catalog_metadata (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`,
      )
      .bind(
        AZ_TRANSLATION_CORRECTION_SEED_KEY,
        String(correctionStatements.length),
        correctedAt,
      )
      .run();
  }

  const seedMarker = await db
    .prepare("SELECT value FROM catalog_metadata WHERE key = ?")
    .bind(PRODUCT_TRANSLATION_SEED_KEY)
    .first();
  if (seedMarker) return;

  const productResult = await db.prepare("SELECT id, version FROM products").all();
  const productVersions = new Map(
    productResult.results.map((product) => [product.id, Number(product.version)]),
  );
  const seededAt = new Date().toISOString();
  const statements = [];

  initialProductTranslations.products.forEach((product) => {
    if (productVersions.get(product.id) !== Number(product.revision)) return;
    Object.entries(product.translations).forEach(([language, translation]) => {
      if (language === "fa") return;
      statements.push(
        db
          .prepare(
            `INSERT OR IGNORE INTO product_translations (
               product_id, language, source_language, name, summary,
               specs_json, tags_json, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            product.id,
            language,
            product.sourceLanguage,
            translation.name,
            translation.summary,
            JSON.stringify(translation.specs),
            JSON.stringify(translation.tags),
            seededAt,
          ),
      );
    });
  });

  for (let index = 0; index < statements.length; index += 75) {
    await db.batch(statements.slice(index, index + 75));
  }

  await db
    .prepare(
      `INSERT INTO catalog_metadata (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
    )
    .bind(PRODUCT_TRANSLATION_SEED_KEY, String(statements.length), seededAt)
    .run();
}

export async function ensureProductDetails(db) {
  await ensurePlatformSchema(db);
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT OR IGNORE INTO product_catalog_details (
         product_id, model, sku, internal_id, applications_json,
         datasheets_json, certificates_json, related_products_json,
         public_quantity, availability_override, override_reason,
         override_expires_at, publication_status, slug, seo_title,
         seo_description, updated_at, updated_by
       )
       SELECT id, '', '', '', '[]', '[]', '[]', '[]', 0, '', '', NULL, 'published', id,
              name, summary, ?, 'system'
       FROM products`,
    )
    .bind(now)
    .run();
}

function translationRowsToObject(rows) {
  return Object.fromEntries(
    rows.map((row) => [
      row.language,
      {
        name: row.name,
        summary: row.summary,
        specs: JSON.parse(row.specs_json || "[]"),
        tags: JSON.parse(row.tags_json || "[]"),
      },
    ]),
  );
}

export function productTranslationStatements(db, productId, translatedProduct, updatedAt) {
  return Object.entries(translatedProduct.translations).map(([language, translation]) =>
    db
      .prepare(
        `INSERT INTO product_translations (
           product_id, language, source_language, name, summary,
           specs_json, tags_json, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(product_id, language) DO UPDATE SET
           source_language = excluded.source_language,
           name = excluded.name,
           summary = excluded.summary,
           specs_json = excluded.specs_json,
           tags_json = excluded.tags_json,
           updated_at = excluded.updated_at`,
      )
      .bind(
        productId,
        language,
        translatedProduct.sourceLanguage,
        translation.name,
        translation.summary,
        JSON.stringify(translation.specs),
        JSON.stringify(translation.tags),
        updatedAt,
      ),
  );
}

export function rowToProduct(row, translations = {}, sourceLanguage = null) {
  const imageUrl = String(row.image_url || "");
  const dataStatus = row.inventory_data_status || "unavailable";
  const quantity = row.inventory_quantity === null || row.inventory_quantity === undefined
    ? null
    : Number(row.inventory_quantity);
  const threshold = row.low_stock_threshold === null || row.low_stock_threshold === undefined
    ? null
    : Number(row.low_stock_threshold);
  const availabilityStatus = availabilityFor(quantity, threshold, dataStatus);
  const overrideActive = Boolean(
    row.availability_override
      && (!row.override_expires_at || new Date(row.override_expires_at).getTime() > Date.now()),
  );
  const publicAvailabilityStatus = overrideActive
    ? row.availability_override
    : availabilityStatus;
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    image: imageUrl.startsWith("/media/")
      ? `${imageUrl}?v=${encodeURIComponent(row.version)}`
      : imageUrl,
    summary: row.summary,
    specs: JSON.parse(row.specs_json || "[]"),
    tags: JSON.parse(row.tags_json || "[]"),
    sortOrder: row.sort_order,
    revision: row.version,
    updatedAt: row.updated_at,
    sourceLanguage,
    translations,
    model: row.model || "",
    sku: row.sku || "",
    internalId: row.internal_id || "",
    applications: JSON.parse(row.applications_json || "[]"),
    slug: row.slug || row.id,
    publicationStatus: row.publication_status || "published",
    seoTitle: row.seo_title || "",
    seoDescription: row.seo_description || "",
    lowStockThreshold: threshold,
    publicQuantity: Boolean(row.public_quantity),
    availabilityOverride: row.availability_override || "",
    overrideReason: row.override_reason || "",
    overrideExpiresAt: row.override_expires_at || null,
    availability: {
      status: publicAvailabilityStatus,
      baseStatus: availabilityStatus,
      overridden: overrideActive,
      quantity: row.public_quantity ? quantity : null,
      exactQuantityPublic: Boolean(row.public_quantity),
      dataStatus,
      reportMonth: row.report_month === null || row.report_month === undefined
        ? null
        : Number(row.report_month),
      reportYear: row.report_year === null || row.report_year === undefined
        ? null
        : Number(row.report_year),
      updatedAt: row.inventory_updated_at || null,
      source: row.inventory_source || null,
    },
    workbookCodes: JSON.parse(row.workbook_codes_json || "[]"),
    inventoryMapped: Number(row.mapped_row_count || 0) > 0,
  };
}

const PRODUCT_SELECT = `
  SELECT p.*,
         COALESCE(d.model, '') AS model,
         COALESCE(d.sku, '') AS sku,
         COALESCE(d.internal_id, '') AS internal_id,
         COALESCE(d.applications_json, '[]') AS applications_json,
         COALESCE(d.slug, p.id) AS slug,
         COALESCE(d.publication_status, 'published') AS publication_status,
         COALESCE(d.seo_title, '') AS seo_title,
         COALESCE(d.seo_description, '') AS seo_description,
         d.low_stock_threshold,
         COALESCE(d.public_quantity, 0) AS public_quantity,
         COALESCE(d.availability_override, '') AS availability_override,
         COALESCE(d.override_reason, '') AS override_reason,
         d.override_expires_at,
         i.quantity AS inventory_quantity,
         i.availability_status,
         i.data_status AS inventory_data_status,
         i.report_month,
         i.report_year,
         i.updated_at AS inventory_updated_at,
         i.source_name AS inventory_source,
         COALESCE(i.workbook_codes_json, '[]') AS workbook_codes_json,
         COALESCE(i.mapped_row_count, 0) AS mapped_row_count
  FROM products p
  LEFT JOIN product_catalog_details d ON d.product_id = p.id
  LEFT JOIN product_inventory i ON i.product_id = p.id`;

export async function getProduct(db, id) {
  await ensureProductTranslations(db);
  await ensureProductDetails(db);
  const row = await db.prepare(`${PRODUCT_SELECT} WHERE p.id = ? OR d.slug = ? LIMIT 1`).bind(id, id).first();
  if (!row) return null;
  const translationResult = await db
    .prepare(
      `SELECT language, source_language, name, summary, specs_json, tags_json
       FROM product_translations WHERE product_id = ?`,
    )
    .bind(row.id)
    .all();
  const translationRows = translationResult.results;
  const translations = translationRowsToObject(translationRows);
  return rowToProduct(row, translations, translationRows[0]?.source_language || null);
}

export async function listProducts(db, { includeDrafts = false } = {}) {
  await ensureCatalog(db);
  await ensureProductTranslations(db);
  await ensureProductDetails(db);
  const [productResult, translationResult] = await Promise.all([
    db
      .prepare(
        `${PRODUCT_SELECT}
         ${includeDrafts ? "" : "WHERE COALESCE(d.publication_status, 'published') = 'published'"}
         ORDER BY p.sort_order ASC, p.created_at ASC`,
      )
      .all(),
    db
      .prepare(
        `SELECT product_id, language, source_language, name, summary, specs_json, tags_json
         FROM product_translations`,
      )
      .all(),
  ]);
  const translationsByProduct = new Map();
  translationResult.results.forEach((row) => {
    if (!translationsByProduct.has(row.product_id)) translationsByProduct.set(row.product_id, []);
    translationsByProduct.get(row.product_id).push(row);
  });
  return productResult.results.map((row) => {
    const translationRows = translationsByProduct.get(row.id) || [];
    return rowToProduct(
      row,
      translationRowsToObject(translationRows),
      translationRows[0]?.source_language || null,
    );
  });
}

export async function writeAudit(db, actorEmail, action, targetType, targetId, details = {}) {
  try {
    await db
      .prepare(
        `INSERT INTO audit_log (
           actor_email, action, target_type, target_id, details_json, created_at
         ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        actorEmail,
        action,
        targetType,
        targetId,
        JSON.stringify(details),
        new Date().toISOString(),
      )
      .run();
  } catch (error) {
    console.error("Could not write audit log", error);
  }
}
