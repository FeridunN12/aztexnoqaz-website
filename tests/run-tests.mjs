import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  applyProductInventoryPermission,
  toProductEditorProduct,
  toPublicCatalogProduct,
} from "../functions/_lib/catalog-access.js";
import { availabilityFor } from "../functions/_lib/inventory.js";
import { detectImageType } from "../functions/_lib/products.js";
import { hasPermission } from "../functions/_lib/platform.js";
import { onRequestGet as getAdminDashboard } from "../functions/api/admin/dashboard.js";
import { onRequestGet as getAdminInventory } from "../functions/api/admin/inventory.js";
import { onRequestGet as getAdminQuoteDetails } from "../functions/api/admin/quotes/[id].js";
import {
  normalizeInventoryText,
  parseInventoryWorkbook,
} from "../functions/_lib/xlsx.js";
import { sanitizedInventoryWorkbook } from "./fixtures/sanitized-inventory.mjs";

const tests = [];
function test(name, callback) {
  tests.push({ name, callback });
}

test("availability rules use only real quantity and configured thresholds", () => {
  assert.equal(availabilityFor(12, null, "current"), "in_stock");
  assert.equal(availabilityFor(3, 5, "current"), "low_stock");
  assert.equal(availabilityFor(0, 5, "current"), "out_of_stock");
  assert.equal(availabilityFor(null, null, "current"), "contact");
  assert.equal(availabilityFor(10, null, "unavailable"), "unavailable");
});

test("public product projection excludes all inventory values and report metadata", () => {
  const projected = toPublicCatalogProduct({
    id: "regulator-1",
    name: "Gas regulator",
    brand: "ESKA",
    category: "regulators",
    model: "ESKA-40",
    sku: "SKU-40",
    internalId: "CAT-40",
    availability: {
      status: "in_stock",
      quantity: 987654321,
      reportMonth: 9,
      reportYear: 2026,
      source: "private-workbook.xlsx",
    },
    lowStockThreshold: 4,
    publicQuantity: true,
    availabilityOverride: "out_of_stock",
    overrideReason: "internal note",
    overrideExpiresAt: "2026-10-01T00:00:00.000Z",
    workbookCodes: ["WORKBOOK-40"],
    inventoryMapped: true,
  });
  assert.equal(projected.name, "Gas regulator");
  assert.equal(projected.model, "ESKA-40");
  assert.equal("availability" in projected, false);
  assert.equal("lowStockThreshold" in projected, false);
  assert.equal("publicQuantity" in projected, false);
  assert.equal("availabilityOverride" in projected, false);
  assert.equal("workbookCodes" in projected, false);
  assert.doesNotMatch(JSON.stringify(projected), /987654321|private-workbook|WORKBOOK-40|internal note/);
});

test("product editors receive catalog fields without inventory details", () => {
  const projected = toProductEditorProduct({
    id: "regulator-1",
    name: "Gas regulator",
    availability: { status: "low_stock", quantity: 3 },
    lowStockThreshold: 5,
    publicQuantity: true,
    availabilityOverride: "in_stock",
    overrideReason: "internal note",
    overrideExpiresAt: "2026-10-01T00:00:00.000Z",
    workbookCodes: ["WORKBOOK-40"],
    inventoryMapped: true,
  });
  assert.equal(projected.name, "Gas regulator");
  for (const key of ["availability", "lowStockThreshold", "publicQuantity", "availabilityOverride", "overrideReason", "overrideExpiresAt", "workbookCodes", "inventoryMapped"]) {
    assert.equal(key in projected, false, `${key} must be private`);
  }
});

test("only inventory-capable roles can view or change inventory settings", () => {
  assert.equal(hasPermission({ platformRole: "administrator" }, "inventory"), true);
  assert.equal(hasPermission({ platformRole: "inventory_manager" }, "inventory"), true);
  assert.equal(hasPermission({ platformRole: "product_editor" }, "inventory"), false);
  assert.equal(hasPermission({ platformRole: "sales" }, "inventory"), false);
  assert.equal(hasPermission({ platformRole: "viewer" }, "inventory"), false);

  const details = {
    lowStockThreshold: 0,
    publicQuantity: true,
    availabilityOverride: "out_of_stock",
    overrideReason: "forged change",
    overrideExpiresAt: null,
  };
  const existing = {
    low_stock_threshold: 7,
    public_quantity: 1,
    availability_override: "low_stock",
    override_reason: "authorized note",
    override_expires_at: "2026-10-01T00:00:00.000Z",
  };
  const restricted = applyProductInventoryPermission(details, existing, false);
  assert.equal(restricted.lowStockThreshold, 7);
  assert.equal(restricted.publicQuantity, false);
  assert.equal(restricted.availabilityOverride, "low_stock");
  assert.equal(restricted.overrideReason, "authorized note");
  assert.equal(restricted.overrideExpiresAt, existing.override_expires_at);

  const authorized = applyProductInventoryPermission(details, existing, true);
  assert.equal(authorized.lowStockThreshold, 0);
  assert.equal(authorized.availabilityOverride, "out_of_stock");
  assert.equal(authorized.publicQuantity, false);
});

test("inventory endpoint denies staff without inventory capability", async () => {
  const response = await getAdminInventory({
    env: {},
    data: { editor: { platformRole: "product_editor" } },
  });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, "forbidden");
});

test("dashboard omits inventory analytics from staff without inventory capability", async () => {
  const queries = [];
  const db = {
    prepare(query) {
      queries.push(query);
      return {
        first: async () => query.includes("COUNT(*) AS products")
          ? { products: 4, published: 3, brands: 2 }
          : { total: 0, new_count: 0, in_progress: 0, quoted: 0, accepted: 0, completed: 0 },
        all: async () => ({ results: [] }),
      };
    },
  };
  const response = await getAdminDashboard({
    env: { DB: db },
    data: { editor: { platformRole: "sales" } },
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.inventory, null);
  assert.equal(body.latestReport, null);
  assert.deepEqual(body.importHistory, []);
  assert.equal(queries.some((query) => /product_inventory|inventory_imports|inventory_mappings/.test(query)), false);
});

test("sales quotation view omits current and historical inventory status", async () => {
  const queries = [];
  const db = {
    prepare(query) {
      queries.push(query);
      const statement = {
        bind() { return statement; },
        first: async () => ({ id: "quote-1", reference: "AZQ-202609-000001" }),
        all: async () => query.includes("FROM quotation_items")
          ? { results: [{ id: 1, product_id: "p1", product_name: "Regulator", quantity: 2, requirements: "" }] }
          : { results: [] },
      };
      return statement;
    },
  };
  const response = await getAdminQuoteDetails({
    env: { DB: db },
    data: { editor: { platformRole: "sales" } },
    params: { id: "quote-1" },
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.items[0].quantity, 2);
  assert.equal("inventoryStatusAtSubmission" in body.items[0], false);
  assert.equal("currentInventoryStatus" in body.items[0], false);
  assert.equal(queries.some((query) => /product_inventory|availability_status/.test(query)), false);
});

test("Azerbaijani inventory names normalize deterministically", () => {
  assert.equal(normalizeInventoryText("  Son Anbar Qalığı  "), "son anbar qaligi");
  assert.equal(normalizeInventoryText("FMG — Qaz Sayğacı"), "fmg qaz saygaci");
});

test("sanitized workbook detects C, D and AO and validates quantities", async () => {
  const bytes = sanitizedInventoryWorkbook();
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const workbook = await parseInventoryWorkbook(buffer);
  assert.deepEqual(workbook.headers, {
    productNameColumn: 3,
    productCodeColumn: 4,
    finalQuantityColumn: 41,
  });
  assert.equal(workbook.rows.length, 9);
  assert.equal(workbook.rows.find((row) => row.rowNumber === 2).quantity, 12);
  assert.equal(workbook.rows.find((row) => row.rowNumber === 3).quantity, 0);
  assert.ok(workbook.rows.find((row) => row.rowNumber === 5).warnings.includes("missing_code"));
  assert.equal(workbook.rows.find((row) => row.rowNumber === 6).validationStatus, "invalid");
  assert.equal(workbook.rows.find((row) => row.rowNumber === 8).validationStatus, "invalid");
});

test("unsafe or incomplete ZIP files are rejected as workbooks", async () => {
  const bytes = sanitizedInventoryWorkbook();
  const { unzipSync, zipSync } = await import("../functions/_vendor/fflate.js");
  const entries = unzipSync(bytes);
  delete entries["xl/workbook.xml"];
  const broken = zipSync(entries);
  await assert.rejects(
    parseInventoryWorkbook(broken.buffer.slice(broken.byteOffset, broken.byteOffset + broken.byteLength)),
    /complete and valid/,
  );
});

test("image validation uses file signatures", () => {
  assert.equal(detectImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]).buffer), "image/jpeg");
  assert.equal(detectImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).buffer), "image/png");
  assert.equal(detectImageType(new TextEncoder().encode("not-an-image").buffer), null);
});

test("public language configuration excludes the removed Iranian language", async () => {
  const source = await readFile(new URL("../i18n.js", import.meta.url), "utf8");
  const languageBlock = source.slice(source.indexOf("const languages"), source.indexOf("const aboutImages"));
  assert.doesNotMatch(languageBlock, /id:\s*["']fa["']/);
  for (const language of ["az", "en", "tr", "ru", "ka"]) {
    assert.match(languageBlock, new RegExp(`id:\\s*["']${language}["']`));
  }
});

test("catalogue markup retains cached-script hooks and versions its assets together", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const admin = await readFile(new URL("../admin.html", import.meta.url), "utf8");
  for (const id of ["product-grid", "hero-product-count", "hero-report-date", "catalog-report-note", "modal-availability", "modal-report-date", "availability-filter"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  const versions = [...`${html}\n${admin}`.matchAll(/(?:styles\.css|script\.js|i18n\.js|admin\.css|admin\.js)\?v=([^"\s]+)/g)].map((match) => match[1]);
  assert.equal(versions.length, 5);
  assert.equal(new Set(versions).size, 1);
  assert.notEqual(versions[0], "20260720-platform-v1");
});

test("optional staff requests and missing report labels cannot block catalogue rendering", async () => {
  const source = await readFile(new URL("../script.js", import.meta.url), "utf8");
  const initialization = source.slice(source.indexOf("async function initializeSite()"));
  assert.ok(initialization.indexOf("renderProducts();") < initialization.indexOf("updateCatalogFacts();"));
  assert.ok(initialization.indexOf("renderProducts();") < initialization.indexOf("checkEditorSession();"));
  assert.doesNotMatch(initialization, /await\s+checkEditorSession/);
  assert.match(source, /if \(heroReportDate\) heroReportDate\.textContent/);
  assert.match(source, /if \(catalogReportNote\) catalogReportNote\.textContent/);
});

let passed = 0;
for (const { name, callback } of tests) {
  try {
    await callback();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

if (passed !== tests.length) {
  throw new Error(`${tests.length - passed} of ${tests.length} tests failed.`);
}
console.log(`PASS ${passed} tests`);
