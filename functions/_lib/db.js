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

export function rowToProduct(row) {
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
  };
}

export async function listProducts(db) {
  await ensureCatalog(db);
  const result = await db
    .prepare("SELECT * FROM products ORDER BY sort_order ASC, created_at ASC")
    .all();
  return result.results.map(rowToProduct);
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
