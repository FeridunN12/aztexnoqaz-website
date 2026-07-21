import { ApiError } from "./http.js";
import { ensurePlatformSchema, randomId } from "./platform.js";
import { normalizeInventoryText } from "./xlsx.js";

export function availabilityFor(quantity, threshold = null, dataStatus = "current") {
  if (dataStatus === "unavailable") return "unavailable";
  if (dataStatus !== "current" || quantity === null || quantity === undefined) return "contact";
  if (Number(quantity) <= 0) return "out_of_stock";
  if (threshold !== null && Number(quantity) <= Number(threshold)) return "low_stock";
  return "in_stock";
}

function parseJson(value, fallback = []) {
  try {
    return JSON.parse(value || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function importSummary(row) {
  return {
    totalRows: Number(row.total_rows || 0),
    validRows: Number(row.valid_rows || 0),
    mappedRows: Number(row.mapped_rows || 0),
    unmatchedRows: Number(row.unmatched_rows || 0),
    ambiguousRows: Number(row.ambiguous_rows || 0),
    invalidRows: Number(row.invalid_rows || 0),
    duplicateCodes: Number(row.duplicate_codes || 0),
    missingCodes: Number(row.missing_codes || 0),
    invalidQuantities: Number(row.invalid_quantities || 0),
    changedProducts: Number(row.changed_products || 0),
    unchangedProducts: Number(row.unchanged_products || 0),
    missingProducts: Number(row.missing_products || 0),
  };
}

function importRecord(row) {
  return {
    id: row.id,
    fileName: row.file_name,
    fileSize: Number(row.file_size || 0),
    sourceType: row.source_type,
    sourceName: row.source_name,
    reportMonth: Number(row.report_month),
    reportYear: Number(row.report_year),
    note: row.note,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    appliedAt: row.applied_at,
    rolledBackAt: row.rolled_back_at,
    errorMessage: row.error_message,
    summary: importSummary(row),
  };
}

async function catalogCandidates(db) {
  const result = await db
    .prepare(
      `SELECT p.id, p.name, p.brand, p.category,
              COALESCE(d.model, '') AS model,
              COALESCE(d.sku, '') AS sku,
              COALESCE(d.internal_id, '') AS internal_id,
              COALESCE(i.workbook_codes_json, '[]') AS workbook_codes_json
       FROM products p
       LEFT JOIN product_catalog_details d ON d.product_id = p.id
       LEFT JOIN product_inventory i ON i.product_id = p.id
       ORDER BY p.sort_order, p.name`,
    )
    .all();
  return result.results.map((row) => ({
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    model: row.model,
    sku: row.sku,
    internalId: row.internal_id,
    normalizedName: normalizeInventoryText(row.name),
    normalizedModel: normalizeInventoryText(row.model),
    normalizedSku: normalizeInventoryText(row.sku),
    normalizedInternalId: normalizeInventoryText(row.internal_id),
    normalizedWorkbookCodes: parseJson(row.workbook_codes_json)
      .map((code) => normalizeInventoryText(code))
      .filter(Boolean),
  }));
}

function prioritizedProductMatch(row, products) {
  const checks = [
    ["internal_id", (product) => row.normalizedCode && row.normalizedCode === product.normalizedInternalId],
    ["sku", (product) => row.normalizedCode && row.normalizedCode === product.normalizedSku],
    ["workbook_code", (product) => row.normalizedCode && product.normalizedWorkbookCodes.includes(row.normalizedCode)],
    ["model", (product) => row.normalizedName && row.normalizedName === product.normalizedModel],
    ["product_name", (product) => row.normalizedName && row.normalizedName === product.normalizedName],
  ];
  for (const [method, predicate] of checks) {
    const matches = products.filter(predicate).map((product) => product.id);
    if (matches.length) return { matches, method };
  }
  return { matches: [], method: "none" };
}

function countRows(rows) {
  return {
    totalRows: rows.length,
    validRows: rows.filter((row) => row.validationStatus === "valid").length,
    mappedRows: rows.filter((row) => row.validationStatus === "valid" && row.mappingStatus === "mapped").length,
    unmatchedRows: rows.filter((row) => row.mappingStatus === "unmatched").length,
    ambiguousRows: rows.filter((row) => row.mappingStatus === "ambiguous").length,
    invalidRows: rows.filter((row) => row.validationStatus === "invalid").length,
  };
}

function aggregateRows(rows, thresholds = new Map()) {
  const products = new Map();
  for (const row of rows) {
    if (row.validationStatus !== "valid" || row.mappingStatus !== "mapped" || !row.productId) continue;
    if (!products.has(row.productId)) {
      products.set(row.productId, {
        productId: row.productId,
        quantity: 0,
        workbookCodes: new Set(),
        workbookNames: [],
        mappedRowCount: 0,
      });
    }
    const product = products.get(row.productId);
    product.quantity += Number(row.quantity);
    if (row.workbookCode) product.workbookCodes.add(row.workbookCode);
    product.workbookNames.push(row.workbookName);
    product.mappedRowCount += 1;
  }
  return [...products.values()].map((product) => ({
    ...product,
    workbookCodes: [...product.workbookCodes],
    availabilityStatus: availabilityFor(
      product.quantity,
      thresholds.get(product.productId) ?? null,
      "current",
    ),
  }));
}

export async function createImportPreview(db, parsedWorkbook, details, actorEmail) {
  await ensurePlatformSchema(db);
  const duplicate = await db
    .prepare(
      `SELECT id, status FROM inventory_imports
       WHERE file_hash = ? AND status IN ('preview', 'applying', 'applied')
       ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(details.fileHash)
    .first();
  if (duplicate) {
    throw new ApiError(
      409,
      duplicate.status === "applied"
        ? "This workbook has already been applied."
        : "This workbook already has an active preview.",
      "duplicate_import",
    );
  }

  const [products, mappingResult, exclusionResult, inventoryResult] = await Promise.all([
    catalogCandidates(db),
    db.prepare("SELECT source_key, product_id FROM inventory_mappings").all(),
    db.prepare("SELECT source_key FROM inventory_exclusions").all(),
    db.prepare("SELECT product_id, quantity, data_status FROM product_inventory").all(),
  ]);
  const productIds = new Set(products.map((product) => product.id));
  const mappings = new Map(
    mappingResult.results
      .filter((mapping) => productIds.has(mapping.product_id))
      .map((mapping) => [mapping.source_key, mapping.product_id]),
  );
  const exclusions = new Set(exclusionResult.results.map((row) => row.source_key));
  const codeFrequency = new Map();
  for (const row of parsedWorkbook.rows) {
    if (row.normalizedCode) {
      codeFrequency.set(row.normalizedCode, (codeFrequency.get(row.normalizedCode) || 0) + 1);
    }
  }

  const rows = parsedWorkbook.rows.map((row) => {
    const warnings = [...row.warnings];
    if (row.normalizedCode && codeFrequency.get(row.normalizedCode) > 1) {
      warnings.push("duplicate_code");
    }
    const persistedProduct = mappings.get(row.sourceKey);
    const prioritizedMatch = persistedProduct
      ? { matches: [], method: "saved_mapping" }
      : prioritizedProductMatch(row, products);
    const exactMatches = prioritizedMatch.matches;
    let productId = persistedProduct || null;
    let mappingStatus = productId ? "mapped" : "unmatched";
    let matchMethod = productId ? "saved_mapping" : "none";
    if (!productId && exclusions.has(row.sourceKey)) {
      mappingStatus = "ignored";
      matchMethod = "saved_exclusion";
    } else if (!productId && exactMatches.length === 1) {
      [productId] = exactMatches;
      mappingStatus = "mapped";
      matchMethod = prioritizedMatch.method;
    } else if (!productId && exactMatches.length > 1) {
      mappingStatus = "ambiguous";
      matchMethod = "multiple_exact_matches";
      warnings.push("ambiguous_match");
    }
    if (row.validationStatus === "invalid") {
      productId = null;
      mappingStatus = "unmatched";
      matchMethod = "invalid_row";
    }
    return { ...row, warnings, productId, mappingStatus, matchMethod };
  });

  const mappedProductCounts = new Map();
  for (const row of rows) {
    if (row.productId) {
      mappedProductCounts.set(row.productId, (mappedProductCounts.get(row.productId) || 0) + 1);
    }
  }
  for (const row of rows) {
    if (row.productId && mappedProductCounts.get(row.productId) > 1) {
      row.warnings.push("multiple_rows_for_product");
    }
  }

  const counts = countRows(rows);
  const priorInventory = new Map(
    inventoryResult.results.map((row) => [row.product_id, row]),
  );
  const aggregated = aggregateRows(rows);
  const changedProducts = aggregated.filter((product) => {
    const prior = priorInventory.get(product.productId);
    return !prior || Number(prior.quantity) !== product.quantity || prior.data_status !== "current";
  }).length;
  const aggregatedIds = new Set(aggregated.map((product) => product.productId));
  const duplicateCodes = [...codeFrequency.values()].filter((frequency) => frequency > 1).length;
  const missingCodes = rows.filter((row) => row.warnings.includes("missing_code")).length;
  const invalidQuantities = rows.filter((row) => row.warnings.includes("invalid_quantity")).length;
  const unchangedProducts = Math.max(0, aggregated.length - changedProducts);
  const missingProducts = inventoryResult.results.filter((row) => !aggregatedIds.has(row.product_id)).length;
  const importId = randomId("imp");
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO inventory_imports (
         id, file_name, file_hash, file_size, source_type, source_name,
         report_month, report_year, note, status, total_rows, valid_rows,
         mapped_rows, unmatched_rows, ambiguous_rows, invalid_rows,
         duplicate_codes, missing_codes, invalid_quantities, changed_products,
         unchanged_products, missing_products, created_by, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'preview', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      importId,
      details.fileName,
      details.fileHash,
      details.fileSize,
      details.sourceType || "manual",
      details.sourceName || "Monthly workbook upload",
      details.reportMonth,
      details.reportYear,
      details.note || "",
      counts.totalRows,
      counts.validRows,
      counts.mappedRows,
      counts.unmatchedRows,
      counts.ambiguousRows,
      counts.invalidRows,
      duplicateCodes,
      missingCodes,
      invalidQuantities,
      changedProducts,
      unchangedProducts,
      missingProducts,
      actorEmail,
      now,
    )
    .run();

  try {
    const statements = rows.map((row) =>
      db
        .prepare(
          `INSERT INTO inventory_import_rows (
             import_id, row_number, source_key, workbook_code, workbook_name,
             normalized_code, normalized_name, quantity, validation_status,
             mapping_status, product_id, match_method, warnings_json
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          importId,
          row.rowNumber,
          row.sourceKey,
          row.workbookCode,
          row.workbookName,
          row.normalizedCode,
          row.normalizedName,
          row.quantity,
          row.validationStatus,
          row.mappingStatus,
          row.productId,
          row.matchMethod,
          JSON.stringify(row.warnings),
        ),
    );
    for (let index = 0; index < statements.length; index += 50) {
      await db.batch(statements.slice(index, index + 50));
    }
  } catch (error) {
    await db.prepare("DELETE FROM inventory_import_rows WHERE import_id = ?").bind(importId).run();
    await db.prepare("DELETE FROM inventory_imports WHERE id = ?").bind(importId).run();
    throw error;
  }
  return getImportPreview(db, importId);
}

export async function getImportPreview(db, importId) {
  await ensurePlatformSchema(db);
  const [importRow, rowResult, products] = await Promise.all([
    db.prepare("SELECT * FROM inventory_imports WHERE id = ?").bind(importId).first(),
    db
      .prepare(
        `SELECT r.*, p.name AS product_name, p.brand AS product_brand
         FROM inventory_import_rows r
         LEFT JOIN products p ON p.id = r.product_id
         WHERE r.import_id = ? ORDER BY r.row_number`,
      )
      .bind(importId)
      .all(),
    catalogCandidates(db),
  ]);
  if (!importRow) throw new ApiError(404, "This inventory import was not found.", "not_found");
  return {
    import: importRecord(importRow),
    products: products.map(({
      normalizedName,
      normalizedModel,
      normalizedSku,
      normalizedInternalId,
      normalizedWorkbookCodes,
      ...product
    }) => product),
    rows: rowResult.results.map((row) => ({
      rowNumber: Number(row.row_number),
      sourceKey: row.source_key,
      workbookCode: row.workbook_code,
      workbookName: row.workbook_name,
      quantity: row.quantity === null ? null : Number(row.quantity),
      validationStatus: row.validation_status,
      mappingStatus: row.mapping_status,
      productId: row.product_id,
      productName: row.product_name,
      productBrand: row.product_brand,
      matchMethod: row.match_method,
      warnings: parseJson(row.warnings_json),
    })),
  };
}

async function refreshImportCounts(db, importId) {
  const [counts, productCounts] = await Promise.all([
    db
    .prepare(
      `SELECT COUNT(*) AS total_rows,
              SUM(CASE WHEN validation_status = 'valid' THEN 1 ELSE 0 END) AS valid_rows,
              SUM(CASE WHEN validation_status = 'valid' AND mapping_status = 'mapped' THEN 1 ELSE 0 END) AS mapped_rows,
              SUM(CASE WHEN mapping_status = 'unmatched' THEN 1 ELSE 0 END) AS unmatched_rows,
              SUM(CASE WHEN mapping_status = 'ambiguous' THEN 1 ELSE 0 END) AS ambiguous_rows,
              SUM(CASE WHEN validation_status = 'invalid' THEN 1 ELSE 0 END) AS invalid_rows
       FROM inventory_import_rows WHERE import_id = ?`,
    )
    .bind(importId)
    .first(),
    db
      .prepare(
        `WITH aggregated AS (
           SELECT product_id, SUM(quantity) AS quantity
           FROM inventory_import_rows
           WHERE import_id = ? AND validation_status = 'valid'
             AND mapping_status = 'mapped' AND product_id IS NOT NULL
           GROUP BY product_id
         )
         SELECT
           (SELECT COUNT(*) FROM (
              SELECT normalized_code FROM inventory_import_rows
              WHERE import_id = ? AND normalized_code <> ''
              GROUP BY normalized_code HAVING COUNT(*) > 1
            )) AS duplicate_codes,
           (SELECT COUNT(*) FROM inventory_import_rows
              WHERE import_id = ? AND normalized_code = '') AS missing_codes,
           (SELECT COUNT(*) FROM inventory_import_rows
              WHERE import_id = ? AND quantity IS NULL) AS invalid_quantities,
           (SELECT COUNT(*) FROM aggregated a LEFT JOIN product_inventory i ON i.product_id = a.product_id
              WHERE i.product_id IS NULL OR i.quantity <> a.quantity OR i.data_status <> 'current') AS changed_products,
           (SELECT COUNT(*) FROM aggregated a JOIN product_inventory i ON i.product_id = a.product_id
              WHERE i.quantity = a.quantity AND i.data_status = 'current') AS unchanged_products,
           (SELECT COUNT(*) FROM product_inventory i
              WHERE NOT EXISTS (SELECT 1 FROM aggregated a WHERE a.product_id = i.product_id)) AS missing_products`,
      )
      .bind(importId, importId, importId, importId)
      .first(),
  ]);
  await db
    .prepare(
      `UPDATE inventory_imports SET total_rows = ?, valid_rows = ?, mapped_rows = ?,
         unmatched_rows = ?, ambiguous_rows = ?, invalid_rows = ?, duplicate_codes = ?,
         missing_codes = ?, invalid_quantities = ?, changed_products = ?,
         unchanged_products = ?, missing_products = ? WHERE id = ?`,
    )
    .bind(
      Number(counts.total_rows || 0),
      Number(counts.valid_rows || 0),
      Number(counts.mapped_rows || 0),
      Number(counts.unmatched_rows || 0),
      Number(counts.ambiguous_rows || 0),
      Number(counts.invalid_rows || 0),
      Number(productCounts.duplicate_codes || 0),
      Number(productCounts.missing_codes || 0),
      Number(productCounts.invalid_quantities || 0),
      Number(productCounts.changed_products || 0),
      Number(productCounts.unchanged_products || 0),
      Number(productCounts.missing_products || 0),
      importId,
    )
    .run();
}

export async function updateImportMapping(db, importId, rowNumber, action, productId, actorEmail) {
  await ensurePlatformSchema(db);
  const importRow = await db.prepare("SELECT status FROM inventory_imports WHERE id = ?").bind(importId).first();
  if (!importRow) throw new ApiError(404, "This inventory import was not found.", "not_found");
  if (importRow.status !== "preview") {
    throw new ApiError(409, "Only an active preview can be remapped.", "import_locked");
  }
  const row = await db
    .prepare(
      `SELECT validation_status, source_key, workbook_code, workbook_name
       FROM inventory_import_rows WHERE import_id = ? AND row_number = ?`,
    )
    .bind(importId, rowNumber)
    .first();
  if (!row) throw new ApiError(404, "This workbook row was not found.", "not_found");
  if (row.validation_status !== "valid") {
    throw new ApiError(409, "Invalid workbook rows cannot be mapped.", "invalid_row");
  }

  if (action === "ignore") {
    const now = new Date().toISOString();
    await db.batch([
      db
        .prepare(
          `UPDATE inventory_import_rows SET product_id = NULL, mapping_status = 'ignored',
             match_method = 'manual_ignore' WHERE import_id = ? AND row_number = ?`,
        )
        .bind(importId, rowNumber),
      db.prepare("DELETE FROM inventory_mappings WHERE source_key = ?").bind(row.source_key),
      db
        .prepare(
          `INSERT INTO inventory_exclusions (
             source_key, workbook_code, workbook_name, reason, created_by, created_at, updated_at
           ) VALUES (?, ?, ?, 'Excluded during import review', ?, ?, ?)
           ON CONFLICT(source_key) DO UPDATE SET workbook_code = excluded.workbook_code,
             workbook_name = excluded.workbook_name, updated_at = excluded.updated_at,
             created_by = excluded.created_by`,
        )
        .bind(
          row.source_key,
          row.workbook_code,
          row.workbook_name,
          actorEmail,
          now,
          now,
        ),
    ]);
  } else if (action === "clear") {
    await db.batch([
      db
        .prepare(
          `UPDATE inventory_import_rows SET product_id = NULL, mapping_status = 'unmatched',
             match_method = 'none' WHERE import_id = ? AND row_number = ?`,
        )
        .bind(importId, rowNumber),
      db.prepare("DELETE FROM inventory_mappings WHERE source_key = ?").bind(row.source_key),
      db.prepare("DELETE FROM inventory_exclusions WHERE source_key = ?").bind(row.source_key),
    ]);
  } else {
    const product = await db.prepare("SELECT id FROM products WHERE id = ?").bind(productId).first();
    if (!product) throw new ApiError(400, "Choose a valid catalogue product.", "invalid_product");
    await db.batch([
      db
        .prepare(
          `UPDATE inventory_import_rows SET product_id = ?, mapping_status = 'mapped',
             match_method = 'manual' WHERE import_id = ? AND row_number = ?`,
        )
        .bind(productId, importId, rowNumber),
      db.prepare("DELETE FROM inventory_exclusions WHERE source_key = ?").bind(row.source_key),
    ]);
  }
  await refreshImportCounts(db, importId);
  return getImportPreview(db, importId);
}

export async function confirmInventoryImport(db, importId, actorEmail) {
  await ensurePlatformSchema(db);
  const importRow = await db.prepare("SELECT * FROM inventory_imports WHERE id = ?").bind(importId).first();
  if (!importRow) throw new ApiError(404, "This inventory import was not found.", "not_found");
  if (importRow.status !== "preview") {
    throw new ApiError(409, "This import is no longer awaiting confirmation.", "import_locked");
  }
  if (Number(importRow.ambiguous_rows || 0) > 0) {
    throw new ApiError(409, "Review every ambiguous match before applying this import.", "ambiguous_mappings");
  }

  const [rowResult, thresholdResult, currentResult] = await Promise.all([
    db
      .prepare(
        `SELECT row_number, source_key, workbook_code, workbook_name, normalized_code,
                normalized_name, quantity, validation_status, mapping_status,
                product_id AS productId, match_method
         FROM inventory_import_rows WHERE import_id = ? ORDER BY row_number`,
      )
      .bind(importId)
      .all(),
    db.prepare("SELECT product_id, low_stock_threshold FROM product_catalog_details").all(),
    db.prepare("SELECT product_id, quantity, data_status FROM product_inventory").all(),
  ]);
  const rows = rowResult.results.map((row) => ({
    ...row,
    rowNumber: Number(row.row_number),
    workbookCode: row.workbook_code,
    workbookName: row.workbook_name,
    validationStatus: row.validation_status,
    mappingStatus: row.mapping_status,
    quantity: row.quantity === null ? null : Number(row.quantity),
  }));
  const thresholds = new Map(
    thresholdResult.results.map((row) => [
      row.product_id,
      row.low_stock_threshold === null ? null : Number(row.low_stock_threshold),
    ]),
  );
  const aggregated = aggregateRows(rows, thresholds);
  if (!aggregated.length) {
    throw new ApiError(409, "Map at least one valid workbook row before applying the import.", "no_mapped_rows");
  }
  const current = new Map(currentResult.results.map((row) => [row.product_id, row]));
  const changedProducts = aggregated.filter((product) => {
    const before = current.get(product.productId);
    return !before || Number(before.quantity) !== product.quantity || before.data_status !== "current";
  }).length;
  const now = new Date().toISOString();
  const payload = aggregated.map((product) => ({
    productId: product.productId,
    quantity: product.quantity,
    availabilityStatus: product.availabilityStatus,
    workbookCodes: product.workbookCodes,
    workbookNames: product.workbookNames,
    mappedRowCount: product.mappedRowCount,
  }));
  const payloadJson = JSON.stringify(payload);

  await db.batch([
    db.prepare("DELETE FROM inventory_snapshot_items WHERE import_id = ?").bind(importId),
    db
      .prepare(
        `INSERT INTO inventory_snapshot_items (
           import_id, product_id, had_record, quantity, availability_status, data_status,
           source_import_id, source_name, report_month, report_year, workbook_codes_json,
           workbook_names_json, mapped_row_count, updated_at
         ) SELECT ?, product_id, 1, quantity, availability_status, data_status,
                  source_import_id, source_name, report_month, report_year, workbook_codes_json,
                  workbook_names_json, mapped_row_count, updated_at FROM product_inventory`,
      )
      .bind(importId),
    db
      .prepare(
        `INSERT OR IGNORE INTO inventory_snapshot_items (import_id, product_id, had_record)
         SELECT ?, json_extract(value, '$.productId'), 0 FROM json_each(?)`,
      )
      .bind(importId, payloadJson),
    db
      .prepare(
        `UPDATE product_inventory
         SET data_status = 'missing_from_report', availability_status = 'contact', updated_at = ?
         WHERE product_id NOT IN (
           SELECT json_extract(value, '$.productId') FROM json_each(?)
         )`,
      )
      .bind(now, payloadJson),
    db
      .prepare(
        `INSERT INTO product_inventory (
           product_id, quantity, availability_status, data_status, source_import_id,
           source_name, report_month, report_year, workbook_codes_json,
           workbook_names_json, mapped_row_count, updated_at
         )
         SELECT json_extract(value, '$.productId'), json_extract(value, '$.quantity'),
                json_extract(value, '$.availabilityStatus'), 'current', ?, ?, ?, ?,
                json_extract(value, '$.workbookCodes'), json_extract(value, '$.workbookNames'),
                json_extract(value, '$.mappedRowCount'), ?
         FROM json_each(?) WHERE 1
         ON CONFLICT(product_id) DO UPDATE SET
           quantity = excluded.quantity, availability_status = excluded.availability_status,
           data_status = 'current', source_import_id = excluded.source_import_id,
           source_name = excluded.source_name, report_month = excluded.report_month,
           report_year = excluded.report_year, workbook_codes_json = excluded.workbook_codes_json,
           workbook_names_json = excluded.workbook_names_json,
           mapped_row_count = excluded.mapped_row_count, updated_at = excluded.updated_at`,
      )
      .bind(
        importId,
        importRow.source_name,
        importRow.report_month,
        importRow.report_year,
        now,
        payloadJson,
      ),
    db
      .prepare(
        `INSERT INTO inventory_mappings (
           source_key, workbook_code, workbook_name, normalized_code, normalized_name,
           product_id, match_method, created_by, created_at, updated_at
         )
         SELECT source_key, workbook_code, workbook_name, normalized_code, normalized_name,
                product_id, match_method, ?, ?, ?
         FROM inventory_import_rows
         WHERE import_id = ? AND validation_status = 'valid'
           AND mapping_status = 'mapped' AND product_id IS NOT NULL
         ON CONFLICT(source_key) DO UPDATE SET
           workbook_code = excluded.workbook_code, workbook_name = excluded.workbook_name,
           normalized_code = excluded.normalized_code, normalized_name = excluded.normalized_name,
           product_id = excluded.product_id, match_method = excluded.match_method,
           updated_at = excluded.updated_at`,
      )
      .bind(actorEmail, now, now, importId),
    db
      .prepare(
        `UPDATE inventory_imports SET status = 'applied', applied_at = ?,
           mapped_rows = ?, changed_products = ?, error_message = NULL WHERE id = ?`,
      )
      .bind(now, payload.length, changedProducts, importId),
  ]);
  return getImportPreview(db, importId);
}

export async function rollbackInventoryImport(db, importId) {
  await ensurePlatformSchema(db);
  const importRow = await db.prepare("SELECT * FROM inventory_imports WHERE id = ?").bind(importId).first();
  if (!importRow) throw new ApiError(404, "This inventory import was not found.", "not_found");
  if (importRow.status !== "applied") {
    throw new ApiError(409, "Only an applied import can be rolled back.", "import_locked");
  }
  const latest = await db
    .prepare("SELECT id FROM inventory_imports WHERE status = 'applied' ORDER BY applied_at DESC LIMIT 1")
    .first();
  if (latest?.id !== importId) {
    throw new ApiError(409, "Roll back the latest applied import first.", "rollback_order");
  }
  const snapshotCount = await db
    .prepare("SELECT COUNT(*) AS count FROM inventory_snapshot_items WHERE import_id = ?")
    .bind(importId)
    .first();
  if (!Number(snapshotCount?.count || 0)) {
    throw new ApiError(409, "No rollback snapshot is available for this import.", "snapshot_missing");
  }
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `DELETE FROM product_inventory WHERE product_id IN (
           SELECT product_id FROM inventory_snapshot_items WHERE import_id = ? AND had_record = 0
         )`,
      )
      .bind(importId),
    db
      .prepare(
        `INSERT INTO product_inventory (
           product_id, quantity, availability_status, data_status, source_import_id,
           source_name, report_month, report_year, workbook_codes_json,
           workbook_names_json, mapped_row_count, updated_at
         )
         SELECT product_id, quantity, availability_status, data_status, source_import_id,
                source_name, report_month, report_year, workbook_codes_json,
                workbook_names_json, mapped_row_count, updated_at
         FROM inventory_snapshot_items WHERE import_id = ? AND had_record = 1
         ON CONFLICT(product_id) DO UPDATE SET
           quantity = excluded.quantity, availability_status = excluded.availability_status,
           data_status = excluded.data_status, source_import_id = excluded.source_import_id,
           source_name = excluded.source_name, report_month = excluded.report_month,
           report_year = excluded.report_year, workbook_codes_json = excluded.workbook_codes_json,
           workbook_names_json = excluded.workbook_names_json,
           mapped_row_count = excluded.mapped_row_count, updated_at = excluded.updated_at`,
      )
      .bind(importId),
    db
      .prepare("UPDATE inventory_imports SET status = 'rolled_back', rolled_back_at = ? WHERE id = ?")
      .bind(now, importId),
  ]);
  return getImportPreview(db, importId);
}

export async function listInventoryImports(db, limit = 50) {
  await ensurePlatformSchema(db);
  const result = await db
    .prepare("SELECT * FROM inventory_imports ORDER BY created_at DESC LIMIT ?")
    .bind(Math.min(100, Math.max(1, Number(limit) || 50)))
    .all();
  return result.results.map(importRecord);
}
