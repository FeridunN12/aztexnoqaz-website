import { ApiError } from "./http.js";
import { parsePositiveNumber, sha256Hex } from "./platform.js";
import { inflateSync } from "../_vendor/fflate.js";

const decoder = new TextDecoder("utf-8");
const MAX_ENTRIES = 250;
const MAX_UNCOMPRESSED_BYTES = 24 * 1024 * 1024;
const MAX_ROWS = 5000;

function uint16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function uint32(bytes, offset) {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

function findEndOfCentralDirectory(bytes) {
  const minimum = Math.max(0, bytes.length - 65_557);
  for (let offset = bytes.length - 22; offset >= minimum; offset -= 1) {
    if (uint32(bytes, offset) === 0x06054b50) return offset;
  }
  throw new ApiError(400, "The workbook ZIP structure is invalid.", "invalid_workbook");
}

function inflateRaw(bytes, expectedSize) {
  try {
    return inflateSync(bytes, { out: new Uint8Array(expectedSize) });
  } catch {
    throw new ApiError(400, "The workbook contains a damaged compressed entry.", "invalid_workbook");
  }
}

async function readZipEntries(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes.length < 22 || uint32(bytes, 0) !== 0x04034b50) {
    throw new ApiError(400, "Choose a valid .xlsx workbook.", "invalid_workbook");
  }

  const endOffset = findEndOfCentralDirectory(bytes);
  const entryCount = uint16(bytes, endOffset + 10);
  const directoryOffset = uint32(bytes, endOffset + 16);
  if (!entryCount || entryCount > MAX_ENTRIES || directoryOffset >= bytes.length) {
    throw new ApiError(400, "The workbook structure is outside the supported limits.", "invalid_workbook");
  }

  const entries = new Map();
  let cursor = directoryOffset;
  let totalUncompressed = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (uint32(bytes, cursor) !== 0x02014b50) {
      throw new ApiError(400, "The workbook directory is invalid.", "invalid_workbook");
    }
    const method = uint16(bytes, cursor + 10);
    const compressedSize = uint32(bytes, cursor + 20);
    const uncompressedSize = uint32(bytes, cursor + 24);
    const nameLength = uint16(bytes, cursor + 28);
    const extraLength = uint16(bytes, cursor + 30);
    const commentLength = uint16(bytes, cursor + 32);
    const localOffset = uint32(bytes, cursor + 42);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength)).replaceAll("\\", "/");

    totalUncompressed += uncompressedSize;
    if (
      totalUncompressed > MAX_UNCOMPRESSED_BYTES ||
      uncompressedSize > MAX_UNCOMPRESSED_BYTES ||
      (compressedSize > 0 && uncompressedSize / compressedSize > 250) ||
      ![0, 8].includes(method) ||
      name.includes("../")
    ) {
      throw new ApiError(400, "The workbook contains an unsupported or unsafe ZIP entry.", "invalid_workbook");
    }
    entries.set(name, { method, compressedSize, uncompressedSize, localOffset });
    cursor += 46 + nameLength + extraLength + commentLength;
  }

  async function readEntry(name) {
    const entry = entries.get(name);
    if (!entry) return null;
    const offset = entry.localOffset;
    if (uint32(bytes, offset) !== 0x04034b50) {
      throw new ApiError(400, "The workbook contains an invalid file entry.", "invalid_workbook");
    }
    const nameLength = uint16(bytes, offset + 26);
    const extraLength = uint16(bytes, offset + 28);
    const start = offset + 30 + nameLength + extraLength;
    const end = start + entry.compressedSize;
    if (end > bytes.length) {
      throw new ApiError(400, "The workbook contains a truncated file entry.", "invalid_workbook");
    }
    const compressed = bytes.slice(start, end);
    const contents = entry.method === 0
      ? compressed
      : inflateRaw(compressed, entry.uncompressedSize);
    if (contents.length !== entry.uncompressedSize) {
      throw new ApiError(400, "The workbook entry size is invalid.", "invalid_workbook");
    }
    return contents;
  }

  return { entries, readEntry };
}

function decodeXml(value) {
  return String(value || "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replace(/&#(\d+);/g, (match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replaceAll("&amp;", "&");
}

function attribute(markup, name) {
  const match = markup.match(new RegExp(`\\b${name}="([^"]*)"`));
  return match ? decodeXml(match[1]) : "";
}

function cellColumn(reference) {
  const letters = String(reference).match(/^[A-Z]+/i)?.[0]?.toUpperCase() || "";
  let column = 0;
  for (const letter of letters) column = column * 26 + letter.charCodeAt(0) - 64;
  return column;
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const values = [];
  for (const match of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const parts = [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => decodeXml(part[1]));
    values.push(parts.join(""));
  }
  return values;
}

function parseCellValue(cellMarkup, body, sharedStrings) {
  const type = attribute(cellMarkup, "t");
  if (type === "inlineStr") {
    return [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
      .map((part) => decodeXml(part[1]))
      .join("");
  }
  const raw = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1];
  if (raw === undefined) return "";
  const value = decodeXml(raw);
  if (type === "s") return sharedStrings[Number(value)] ?? "";
  if (type === "b") return value === "1";
  return value;
}

function parseWorksheet(xml, sharedStrings, selectedColumns = null, rowLimit = MAX_ROWS + 30) {
  const rows = [];
  for (const rowMatch of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const rowNumber = Number(attribute(rowMatch[1], "r")) || rows.length + 1;
    if (rowNumber > rowLimit) break;
    const values = new Map();
    for (const cellMatch of rowMatch[2].matchAll(/<c\b([^>]*?)(?:\/\s*>|>([\s\S]*?)<\/c>)/g)) {
      const reference = attribute(cellMatch[1], "r");
      const column = cellColumn(reference);
      if (!column || (selectedColumns && !selectedColumns.has(column))) continue;
      values.set(column, parseCellValue(cellMatch[1], cellMatch[2] || "", sharedStrings));
    }
    rows.push({ rowNumber, values });
  }
  return rows;
}

function folded(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("az")
    .replaceAll("ə", "e")
    .replaceAll("ı", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ç", "c")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .replace(/\s+/g, " ")
    .trim();
}

function identifyHeaders(rows) {
  for (const row of rows.slice(0, 20)) {
    const found = {};
    for (const [column, value] of row.values) {
      const label = folded(value);
      if (label === "mallarin adi" || label === "mehsulun adi") found.name = column;
      if (label === "mallarin kodu" || label === "mehsulun kodu") found.code = column;
      if (label === "son anbar qaligi miqdari" || label === "yekun anbar qaligi") found.quantity = column;
    }
    if (found.name && found.code && found.quantity) return { rowNumber: row.rowNumber, ...found };
  }
  throw new ApiError(
    400,
    "Required headers were not found. Expected Malların Adı, Malların Kodu and Son Anbar Qalığı Miqdarı.",
    "missing_headers",
  );
}

export function normalizeInventoryText(value) {
  return folded(value)
    .replace(/[“”"'`]/g, "")
    .replace(/[^a-z0-9\s/().+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function inventorySourceKey(name, code) {
  return sha256Hex(`${normalizeInventoryText(name)}|${normalizeInventoryText(code)}`);
}

export async function parseInventoryWorkbook(arrayBuffer) {
  const zip = await readZipEntries(arrayBuffer);
  for (const requiredEntry of ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml"]) {
    if (!zip.entries.has(requiredEntry)) {
      throw new ApiError(400, "Choose a complete and valid .xlsx workbook.", "invalid_workbook");
    }
  }
  const sheetNames = [...zip.entries.keys()]
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
    .sort((left, right) => left.localeCompare(right, "en", { numeric: true }));
  if (!sheetNames.length) {
    throw new ApiError(400, "No worksheet was found in this workbook.", "invalid_workbook");
  }

  const [sheetBytes, sharedBytes] = await Promise.all([
    zip.readEntry(sheetNames[0]),
    zip.readEntry("xl/sharedStrings.xml"),
  ]);
  const sheetXml = decoder.decode(sheetBytes);
  const sharedStrings = parseSharedStrings(sharedBytes ? decoder.decode(sharedBytes) : "");
  const headerRows = parseWorksheet(sheetXml, sharedStrings, null, 25);
  const headers = identifyHeaders(headerRows);
  const selected = new Set([headers.name, headers.code, headers.quantity]);
  const worksheetRows = parseWorksheet(sheetXml, sharedStrings, selected);
  const rows = [];
  const sourceKeys = new Map();

  for (const row of worksheetRows) {
    if (row.rowNumber <= headers.rowNumber) continue;
    const name = String(row.values.get(headers.name) || "").trim();
    if (!name) continue;
    if (rows.length >= MAX_ROWS) {
      throw new ApiError(400, `The workbook exceeds the ${MAX_ROWS}-row import limit.`, "workbook_too_large");
    }
    const code = String(row.values.get(headers.code) || "").trim();
    const rawQuantity = row.values.get(headers.quantity);
    const quantity = parsePositiveNumber(rawQuantity);
    const warnings = [];
    if (!code) warnings.push("missing_code");
    if (quantity === null) warnings.push("invalid_quantity");
    const sourceKey = await inventorySourceKey(name, code);
    const duplicateOf = sourceKeys.get(sourceKey);
    if (duplicateOf) warnings.push(`duplicate_row:${duplicateOf}`);
    else sourceKeys.set(sourceKey, row.rowNumber);
    rows.push({
      rowNumber: row.rowNumber,
      sourceKey,
      workbookName: name.slice(0, 500),
      workbookCode: code.slice(0, 160),
      normalizedName: normalizeInventoryText(name),
      normalizedCode: normalizeInventoryText(code),
      quantity,
      validationStatus: quantity === null || duplicateOf ? "invalid" : "valid",
      warnings,
    });
  }

  if (!rows.length) {
    throw new ApiError(400, "The workbook does not contain any inventory rows.", "empty_workbook");
  }
  return {
    sheet: sheetNames[0],
    headerRow: headers.rowNumber,
    headers: {
      productNameColumn: headers.name,
      productCodeColumn: headers.code,
      finalQuantityColumn: headers.quantity,
    },
    rows,
  };
}
