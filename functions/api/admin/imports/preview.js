import { writeAudit } from "../../../_lib/db.js";
import { ApiError, errorResponse, json, requireSameOrigin } from "../../../_lib/http.js";
import { createImportPreview } from "../../../_lib/inventory.js";
import {
  cleanOptionalText,
  requirePermission,
  sha256Hex,
} from "../../../_lib/platform.js";
import { parseInventoryWorkbook } from "../../../_lib/xlsx.js";

const MAX_WORKBOOK_BYTES = 5 * 1024 * 1024;
const XLSX_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
  "application/zip",
  "",
]);

export async function onRequestPost({ request, env, data }) {
  try {
    requireSameOrigin(request);
    requirePermission(data.editor, "inventory");
    const formData = await request.formData();
    const file = formData.get("workbook");
    if (!file || typeof file.arrayBuffer !== "function" || !file.size) {
      throw new ApiError(400, "Choose an inventory workbook.", "workbook_required");
    }
    const fileName = String(file.name || "inventory.xlsx").slice(0, 180);
    const contentType = String(file.type || "").toLowerCase();
    if (
      file.size > MAX_WORKBOOK_BYTES ||
      !fileName.toLowerCase().endsWith(".xlsx") ||
      !XLSX_TYPES.has(contentType)
    ) {
      throw new ApiError(
        file.size > MAX_WORKBOOK_BYTES ? 413 : 415,
        "Choose a valid .xlsx workbook smaller than 5 MB.",
        "invalid_workbook_file",
      );
    }
    const reportMonth = Number(formData.get("reportMonth"));
    const reportYear = Number(formData.get("reportYear"));
    const currentYear = new Date().getUTCFullYear();
    if (!Number.isInteger(reportMonth) || reportMonth < 1 || reportMonth > 12) {
      throw new ApiError(400, "Choose the report month.", "invalid_report_month");
    }
    if (!Number.isInteger(reportYear) || reportYear < 2000 || reportYear > currentYear + 1) {
      throw new ApiError(400, "Choose a valid report year.", "invalid_report_year");
    }
    const note = cleanOptionalText(formData.get("note"), 500);
    const contents = await file.arrayBuffer();
    const signature = new Uint8Array(contents.slice(0, 4));
    if (signature[0] !== 0x50 || signature[1] !== 0x4b) {
      throw new ApiError(400, "The selected file is not a valid .xlsx workbook.", "invalid_workbook");
    }
    const startedAt = Date.now();
    const parsed = await parseInventoryWorkbook(contents);
    if (Date.now() - startedAt > 8_000) {
      throw new ApiError(408, "Workbook parsing exceeded the safe time limit.", "workbook_timeout");
    }
    const preview = await createImportPreview(
      env.DB,
      parsed,
      {
        fileName,
        fileSize: file.size,
        fileHash: await sha256Hex(contents),
        reportMonth,
        reportYear,
        note,
        sourceType: "manual",
        sourceName: "Monthly workbook upload",
      },
      data.editor.email,
    );
    await writeAudit(env.DB, data.editor.email, "preview", "inventory_import", preview.import.id, {
      reportMonth,
      reportYear,
      rowCount: preview.import.summary.totalRows,
    });
    return json(preview, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
