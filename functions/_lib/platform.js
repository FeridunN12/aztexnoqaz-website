import { ApiError } from "./http.js";

const PLATFORM_TABLES = [
  `CREATE TABLE IF NOT EXISTS staff_profiles (
     editor_email TEXT PRIMARY KEY COLLATE NOCASE,
     platform_role TEXT NOT NULL DEFAULT 'administrator',
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS product_catalog_details (
     product_id TEXT PRIMARY KEY,
     model TEXT NOT NULL DEFAULT '', sku TEXT NOT NULL DEFAULT '',
     internal_id TEXT NOT NULL DEFAULT '', applications_json TEXT NOT NULL DEFAULT '[]',
     datasheets_json TEXT NOT NULL DEFAULT '[]', certificates_json TEXT NOT NULL DEFAULT '[]',
     related_products_json TEXT NOT NULL DEFAULT '[]', low_stock_threshold REAL,
     public_quantity INTEGER NOT NULL DEFAULT 0, availability_override TEXT NOT NULL DEFAULT '',
     override_reason TEXT NOT NULL DEFAULT '', override_expires_at TEXT,
     publication_status TEXT NOT NULL DEFAULT 'published',
     slug TEXT NOT NULL UNIQUE, seo_title TEXT NOT NULL DEFAULT '', seo_description TEXT NOT NULL DEFAULT '',
     updated_at TEXT NOT NULL, updated_by TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS product_catalog_details_status_idx
     ON product_catalog_details(publication_status, slug)`,
  `CREATE TABLE IF NOT EXISTS inventory_imports (
     id TEXT PRIMARY KEY, file_name TEXT NOT NULL, file_hash TEXT NOT NULL,
     file_size INTEGER NOT NULL, source_type TEXT NOT NULL DEFAULT 'manual',
     source_name TEXT NOT NULL DEFAULT 'Monthly workbook upload', report_month INTEGER NOT NULL,
     report_year INTEGER NOT NULL, note TEXT NOT NULL DEFAULT '', status TEXT NOT NULL,
     total_rows INTEGER NOT NULL DEFAULT 0, valid_rows INTEGER NOT NULL DEFAULT 0,
     mapped_rows INTEGER NOT NULL DEFAULT 0, unmatched_rows INTEGER NOT NULL DEFAULT 0,
     ambiguous_rows INTEGER NOT NULL DEFAULT 0, invalid_rows INTEGER NOT NULL DEFAULT 0,
     duplicate_codes INTEGER NOT NULL DEFAULT 0, missing_codes INTEGER NOT NULL DEFAULT 0,
     invalid_quantities INTEGER NOT NULL DEFAULT 0, changed_products INTEGER NOT NULL DEFAULT 0,
     unchanged_products INTEGER NOT NULL DEFAULT 0, missing_products INTEGER NOT NULL DEFAULT 0,
     created_by TEXT NOT NULL,
     created_at TEXT NOT NULL, applied_at TEXT, rolled_back_at TEXT, error_message TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS inventory_imports_created_idx
     ON inventory_imports(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS inventory_imports_hash_idx
     ON inventory_imports(file_hash, status)`,
  `CREATE TABLE IF NOT EXISTS inventory_import_rows (
     import_id TEXT NOT NULL, row_number INTEGER NOT NULL, source_key TEXT NOT NULL,
     workbook_code TEXT NOT NULL DEFAULT '', workbook_name TEXT NOT NULL,
     normalized_code TEXT NOT NULL DEFAULT '', normalized_name TEXT NOT NULL,
     quantity REAL, validation_status TEXT NOT NULL, mapping_status TEXT NOT NULL,
     product_id TEXT, match_method TEXT NOT NULL DEFAULT 'none', warnings_json TEXT NOT NULL DEFAULT '[]',
     PRIMARY KEY (import_id, row_number)
   )`,
  `CREATE INDEX IF NOT EXISTS inventory_import_rows_product_idx
     ON inventory_import_rows(import_id, product_id)`,
  `CREATE INDEX IF NOT EXISTS inventory_import_rows_source_idx
     ON inventory_import_rows(source_key)`,
  `CREATE TABLE IF NOT EXISTS inventory_mappings (
     source_key TEXT PRIMARY KEY, workbook_code TEXT NOT NULL DEFAULT '',
     workbook_name TEXT NOT NULL, normalized_code TEXT NOT NULL DEFAULT '',
     normalized_name TEXT NOT NULL, product_id TEXT NOT NULL,
     match_method TEXT NOT NULL DEFAULT 'manual', created_by TEXT NOT NULL,
     created_at TEXT NOT NULL, updated_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS inventory_mappings_product_idx
     ON inventory_mappings(product_id)`,
  `CREATE TABLE IF NOT EXISTS inventory_exclusions (
     source_key TEXT PRIMARY KEY, workbook_code TEXT NOT NULL DEFAULT '',
     workbook_name TEXT NOT NULL, reason TEXT NOT NULL DEFAULT 'Excluded by inventory manager',
     created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS product_inventory (
     product_id TEXT PRIMARY KEY, quantity REAL, availability_status TEXT NOT NULL,
     data_status TEXT NOT NULL, source_import_id TEXT NOT NULL, source_name TEXT NOT NULL,
     report_month INTEGER NOT NULL, report_year INTEGER NOT NULL,
     workbook_codes_json TEXT NOT NULL DEFAULT '[]', workbook_names_json TEXT NOT NULL DEFAULT '[]',
     mapped_row_count INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS product_inventory_report_idx
     ON product_inventory(report_year DESC, report_month DESC)`,
  `CREATE TABLE IF NOT EXISTS inventory_snapshot_items (
     import_id TEXT NOT NULL, product_id TEXT NOT NULL, had_record INTEGER NOT NULL DEFAULT 1,
     quantity REAL, availability_status TEXT, data_status TEXT, source_import_id TEXT,
     source_name TEXT, report_month INTEGER, report_year INTEGER, workbook_codes_json TEXT,
     workbook_names_json TEXT, mapped_row_count INTEGER, updated_at TEXT,
     PRIMARY KEY (import_id, product_id)
   )`,
  `CREATE TABLE IF NOT EXISTS inventory_connectors (
     id TEXT PRIMARY KEY, connector_type TEXT NOT NULL, display_name TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'disabled', source_reference TEXT NOT NULL DEFAULT '',
     last_checked_at TEXT, last_changed_at TEXT, last_import_id TEXT, last_error TEXT,
     created_at TEXT NOT NULL, updated_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS quotation_requests (
     id TEXT PRIMARY KEY, reference TEXT NOT NULL UNIQUE, enquiry_type TEXT NOT NULL DEFAULT 'quotation',
     language TEXT NOT NULL DEFAULT 'az', customer_name TEXT NOT NULL,
     company_name TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
     preferred_contact TEXT NOT NULL DEFAULT 'phone', project_location TEXT NOT NULL DEFAULT '',
     timeline TEXT NOT NULL DEFAULT '', message TEXT NOT NULL DEFAULT '',
     status TEXT NOT NULL DEFAULT 'new', assigned_to TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS quotation_requests_status_idx
     ON quotation_requests(status, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS quotation_items (
     id INTEGER PRIMARY KEY AUTOINCREMENT, quotation_id TEXT NOT NULL, product_id TEXT,
     product_name TEXT NOT NULL, quantity REAL, requirements TEXT NOT NULL DEFAULT '',
     inventory_status_at_submission TEXT NOT NULL DEFAULT 'unavailable',
     inventory_report_month INTEGER, inventory_report_year INTEGER
   )`,
  `CREATE TABLE IF NOT EXISTS quotation_events (
     id INTEGER PRIMARY KEY AUTOINCREMENT, quotation_id TEXT NOT NULL, actor_email TEXT NOT NULL,
     event_type TEXT NOT NULL, from_status TEXT, to_status TEXT, note TEXT NOT NULL DEFAULT '',
     created_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS quotation_events_quote_idx
     ON quotation_events(quotation_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS quotation_rate_limits (
     rate_key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_started_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS product_revisions (
     id INTEGER PRIMARY KEY AUTOINCREMENT, product_id TEXT NOT NULL, version INTEGER NOT NULL,
     snapshot_json TEXT NOT NULL, created_at TEXT NOT NULL, created_by TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS product_revisions_product_idx
     ON product_revisions(product_id, version DESC)`,
];

const PLATFORM_COLUMN_UPGRADES = {
  product_catalog_details: [
    ["availability_override", "TEXT NOT NULL DEFAULT ''"],
    ["override_reason", "TEXT NOT NULL DEFAULT ''"],
    ["override_expires_at", "TEXT"],
  ],
  quotation_items: [
    ["inventory_status_at_submission", "TEXT NOT NULL DEFAULT 'unavailable'"],
    ["inventory_report_month", "INTEGER"],
    ["inventory_report_year", "INTEGER"],
  ],
};

export const STAFF_ROLES = new Set([
  "administrator",
  "product_editor",
  "sales",
  "inventory_manager",
  "viewer",
]);

const PERMISSIONS = {
  administrator: new Set(["products", "inventory", "quotes", "team", "view"]),
  product_editor: new Set(["products", "view"]),
  sales: new Set(["quotes", "view"]),
  inventory_manager: new Set(["inventory", "view"]),
  viewer: new Set(["view"]),
};

export async function ensurePlatformSchema(db) {
  const tableStatements = PLATFORM_TABLES.filter((statement) => !statement.startsWith("CREATE INDEX"));
  const indexStatements = PLATFORM_TABLES.filter((statement) => statement.startsWith("CREATE INDEX"));
  for (let index = 0; index < tableStatements.length; index += 20) {
    await db.batch(
      tableStatements.slice(index, index + 20).map((statement) => db.prepare(statement)),
    );
  }

  for (const [table, additions] of Object.entries(PLATFORM_COLUMN_UPGRADES)) {
    const result = await db.prepare(`PRAGMA table_info(${table})`).all();
    const existing = new Set((result.results || []).map((column) => column.name));
    for (const [column, definition] of additions) {
      if (!existing.has(column)) {
        await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
      }
    }
  }

  for (let index = 0; index < indexStatements.length; index += 20) {
    await db.batch(
      indexStatements.slice(index, index + 20).map((statement) => db.prepare(statement)),
    );
  }
}

export async function ensureStaffProfile(db, editor) {
  await ensurePlatformSchema(db);
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT OR IGNORE INTO staff_profiles (editor_email, platform_role, created_at, updated_at)
       VALUES (?, 'administrator', ?, ?)`,
    )
    .bind(editor.email, now, now)
    .run();
  const profile = await db
    .prepare("SELECT platform_role FROM staff_profiles WHERE editor_email = ? COLLATE NOCASE")
    .bind(editor.email)
    .first();
  return STAFF_ROLES.has(profile?.platform_role) ? profile.platform_role : "viewer";
}

export function requirePermission(editor, permission) {
  const role = editor.platformRole || "viewer";
  if (!PERMISSIONS[role]?.has(permission)) {
    throw new ApiError(403, "You do not have permission to perform this action.", "forbidden");
  }
}

export function cleanOptionalText(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length > maxLength) {
    throw new ApiError(400, "One of the submitted fields is too long.", "validation_error");
  }
  return text;
}

export function cleanRequiredText(value, label, maxLength) {
  const text = cleanOptionalText(value, maxLength);
  if (!text) throw new ApiError(400, `${label} is required.`, "validation_error");
  return text;
}

export function parsePositiveNumber(value, { allowZero = true, max = 1_000_000_000 } = {}) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const number = Number(String(value).replace(",", "."));
  if (!Number.isFinite(number) || number < (allowZero ? 0 : Number.EPSILON) || number > max) {
    return null;
  }
  return number;
}

export function randomId(prefix) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

export async function sha256Hex(value) {
  const input = value instanceof ArrayBuffer ? value : new TextEncoder().encode(String(value));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", input));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
