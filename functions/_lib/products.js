import { ApiError } from "./http.js";

export const CATEGORIES = new Set([
  "metering",
  "regulators",
  "conversion",
  "valves",
  "hvac",
  "modems",
  "accessories",
  "cabinets",
]);

const IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function declaredImageType(file) {
  const type = String(file?.type || "").toLowerCase().split(";", 1)[0].trim();
  return type === "image/jpg" ? "image/jpeg" : type;
}

export function detectImageType(contents, declaredType = "") {
  const bytes = new Uint8Array(contents.slice(0, 16));
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const isWebp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";

  if (isJpeg) return "image/jpeg";
  if (isPng) return "image/png";
  if (isWebp) return "image/webp";

  const normalizedDeclaredType = declaredType === "image/jpg" ? "image/jpeg" : declaredType;
  return IMAGE_TYPES.has(normalizedDeclaredType) ? normalizedDeclaredType : null;
}

function cleanText(value, label, maxLength) {
  const text = String(value || "").trim();
  if (!text) throw new ApiError(400, `${label} is required.`, "validation_error");
  if (text.length > maxLength) {
    throw new ApiError(400, `${label} is too long.`, "validation_error");
  }
  return text;
}

function splitList(value, maxItems, maxItemLength) {
  const items = String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (items.length > maxItems || items.some((item) => item.length > maxItemLength)) {
    throw new ApiError(400, "One of the product lists is too long.", "validation_error");
  }
  return [...new Set(items)];
}

export function parseProductForm(formData) {
  const category = cleanText(formData.get("category"), "Category", 40);
  if (!CATEGORIES.has(category)) {
    throw new ApiError(400, "Choose a valid product category.", "validation_error");
  }

  return {
    name: cleanText(formData.get("name"), "Product name", 240),
    brand: cleanText(formData.get("brand"), "Brand", 80),
    category,
    summary: cleanText(formData.get("summary"), "Description", 5000),
    specs: splitList(formData.get("specs"), 20, 1000),
    tags: splitList(formData.get("tags"), 15, 100),
  };
}

const PRODUCT_LANGUAGES = new Set(["az", "en", "tr", "ru", "ka"]);

export function parseTranslationOverrides(formData) {
  const raw = String(formData.get("translationOverrides") || "").trim();
  if (!raw) return {};

  let values;
  try {
    values = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "Product translations are invalid.", "validation_error");
  }
  if (!values || Array.isArray(values) || typeof values !== "object") {
    throw new ApiError(400, "Product translations are invalid.", "validation_error");
  }

  return Object.fromEntries(
    Object.entries(values).map(([language, translation]) => {
      if (!PRODUCT_LANGUAGES.has(language) || !translation || typeof translation !== "object") {
        throw new ApiError(400, "Product translations are invalid.", "validation_error");
      }
      return [
        language,
        {
          name: cleanText(translation.name, "Translated product name", 240),
          summary: cleanText(translation.summary, "Translated description", 5000),
          specs: splitList(Array.isArray(translation.specs) ? translation.specs.join("\n") : translation.specs, 20, 1000),
          tags: splitList(Array.isArray(translation.tags) ? translation.tags.join("\n") : translation.tags, 15, 100),
        },
      ];
    }),
  );
}

export function completeTranslatedProduct(formData, translations) {
  if (![...PRODUCT_LANGUAGES].every((language) => translations[language])) return null;
  const requestedSourceLanguage = String(formData.get("sourceLanguage") || "").trim();
  return {
    sourceLanguage: PRODUCT_LANGUAGES.has(requestedSourceLanguage)
      ? requestedSourceLanguage
      : "az",
    translations,
  };
}

export function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "product";
}

export async function uniqueProductId(db, name) {
  const base = slugify(name);
  let id = base;
  let suffix = 2;
  while (await db.prepare("SELECT id FROM products WHERE id = ?").bind(id).first()) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}

export async function storeImage(db, file, productId) {
  if (!file || typeof file.arrayBuffer !== "function" || !file.size) {
    throw new ApiError(400, "Choose a product photo.", "image_required");
  }
  if (file.size > 1_500_000) {
    throw new ApiError(413, "The optimized product photo must be smaller than 1.5 MB.", "image_too_large");
  }

  const contents = await file.arrayBuffer();
  const contentType = detectImageType(contents, declaredImageType(file));
  if (!contentType) {
    throw new ApiError(415, "The selected file is not a valid product photo.", "invalid_image");
  }
  const extension = IMAGE_TYPES.get(contentType);

  const key = `${productId}-${crypto.randomUUID()}.${extension}`;
  await db
    .prepare(
      `INSERT INTO product_images (
         image_key, content_type, body, byte_size, product_id, created_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(key, contentType, contents, file.size, productId, new Date().toISOString())
    .run();
  return { key, url: `/media/${key}` };
}

export function mediaKeyFromUrl(imageUrl) {
  return String(imageUrl || "").startsWith("/media/")
    ? String(imageUrl).slice("/media/".length)
    : null;
}
