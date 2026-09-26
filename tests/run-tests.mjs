import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { availabilityFor } from "../functions/_lib/inventory.js";
import { detectImageType } from "../functions/_lib/products.js";
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
