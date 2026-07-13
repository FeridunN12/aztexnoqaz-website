import initialProducts from "../../data/products.json";

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
  };
}

export async function getProduct(db, id) {
  await ensureProductTranslations(db);
  const [row, translationResult] = await Promise.all([
    db.prepare("SELECT * FROM products WHERE id = ?").bind(id).first(),
    db
      .prepare(
        `SELECT language, source_language, name, summary, specs_json, tags_json
         FROM product_translations WHERE product_id = ?`,
      )
      .bind(id)
      .all(),
  ]);
  if (!row) return null;
  const translationRows = translationResult.results;
  const translations = translationRowsToObject(translationRows);
  return rowToProduct(row, translations, translationRows[0]?.source_language || null);
}

export async function listProducts(db) {
  await ensureCatalog(db);
  await ensureProductTranslations(db);
  const [productResult, translationResult] = await Promise.all([
    db.prepare("SELECT * FROM products ORDER BY sort_order ASC, created_at ASC").all(),
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
