import { strToU8, zipSync } from "../../functions/_vendor/fflate.js";

const rows = [
  [1, "Malların Adı", "Malların Kodu", "Son Anbar Qalığı Miqdarı"],
  [2, "DEMO GAS METER A", "DEMO-100", 12],
  [3, "DEMO GAS METER B", "DEMO-200", 0],
  [4, "DEMO REGULATOR", "DEMO-300", 4.5],
  [5, "DEMO WITHOUT CODE", "", 3],
  [6, "DEMO INVALID QUANTITY", "DEMO-400", "not-a-number"],
  [7, "DEMO DUPLICATE SOURCE", "DEMO-500", 2],
  [8, "DEMO DUPLICATE SOURCE", "DEMO-500", 2],
  [9, "DEMO SHARED CODE ONE", "DEMO-SHARED", 1],
  [10, "DEMO SHARED CODE TWO", "DEMO-SHARED", 6],
];

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function textCell(reference, value) {
  return `<c r="${reference}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
}

function quantityCell(reference, value) {
  return typeof value === "number"
    ? `<c r="${reference}"><v>${value}</v></c>`
    : textCell(reference, value);
}

function worksheetXml() {
  const sheetRows = rows.map(([rowNumber, name, code, quantity]) => {
    const cells = rowNumber === 1
      ? [textCell(`C${rowNumber}`, name), textCell(`D${rowNumber}`, code), textCell(`AO${rowNumber}`, quantity)]
      : [textCell(`C${rowNumber}`, name), textCell(`D${rowNumber}`, code), quantityCell(`AO${rowNumber}`, quantity)];
    return `<row r="${rowNumber}">${cells.join("")}</row>`;
  });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
      <dimension ref="C1:AO${rows.length}"/>
      <sheetData>${sheetRows.join("")}</sheetData>
    </worksheet>`;
}

export function sanitizedInventoryWorkbook() {
  const files = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
        <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
      </Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
      </Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?>
      <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <sheets><sheet name="Sanitized Inventory" sheetId="1" r:id="rId1"/></sheets>
      </workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
      </Relationships>`),
    "xl/worksheets/sheet1.xml": strToU8(worksheetXml()),
  };
  return zipSync(files, { level: 6 });
}

export const sanitizedFixtureRows = rows;
