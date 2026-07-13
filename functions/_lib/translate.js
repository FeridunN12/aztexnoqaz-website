import { ApiError } from "./http.js";

export const PRODUCT_LANGUAGES = ["az", "en", "tr", "ru", "ka", "fa"];

const TRANSLATE_ENDPOINT = "https://translate.googleapis.com/translate_a/single";
const FIELD_SEPARATOR = "ZXQFIELDSEPARATORQXZ";
const FIELD_SEPARATOR_PATTERN = /\s*ZXQFIELDSEPARATORQXZ\s*/;

function translationError() {
  return new ApiError(
    502,
    "Automatic translation is temporarily unavailable. Try publishing again.",
    "translation_unavailable",
  );
}

async function requestTranslation(text, sourceLanguage, targetLanguage) {
  if (!text.trim() || sourceLanguage === targetLanguage) {
    return { text, sourceLanguage };
  }

  const url = new URL(TRANSLATE_ENDPOINT);
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", sourceLanguage);
  url.searchParams.set("tl", targetLanguage);
  url.searchParams.set("dt", "t");

  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({ q: text }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Translation service returned ${response.status}`);
      const payload = await response.json();
      const translatedText = Array.isArray(payload?.[0])
        ? payload[0].map((segment) => segment?.[0] || "").join("")
        : "";
      if (!translatedText) throw new Error("Translation service returned an empty result");
      return {
        text: translatedText,
        sourceLanguage: String(payload?.[2] || sourceLanguage || "en").toLowerCase(),
      };
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 250));
    } finally {
      clearTimeout(timeout);
    }
  }

  console.error("Product translation failed", lastError);
  throw translationError();
}

function protectTechnicalText(parts, brand) {
  const protectedValues = [];
  const candidates = new Set([String(brand || "").trim()]);

  parts.forEach((part) => {
    String(part)
      .match(/\b(?:[A-Z]{2,}[A-Z0-9./+_-]*|[A-Za-z]*\d[A-Za-z0-9./+_-]*)\b/g)
      ?.forEach((value) => candidates.add(value));
  });

  const orderedCandidates = [...candidates]
    .filter((value) => value.length >= 2)
    .sort((left, right) => right.length - left.length);
  const protectedParts = parts.map((part) => {
    let text = String(part);
    orderedCandidates.forEach((value) => {
      if (!text.includes(value)) return;
      let index = protectedValues.indexOf(value);
      if (index < 0) {
        index = protectedValues.length;
        protectedValues.push(value);
      }
      text = text.split(value).join(`ZXQPH${index}QXZ`);
    });
    return text;
  });

  return { protectedParts, protectedValues };
}

function restoreTechnicalText(text, protectedValues) {
  let restored = String(text).trim();
  protectedValues.forEach((value, index) => {
    restored = restored.replace(new RegExp(`ZXQPH${index}QXZ`, "gi"), value);
  });
  return restored;
}

async function translateParts(protectedParts, protectedValues, sourceLanguage, targetLanguage, initialResult = null) {
  if (sourceLanguage === targetLanguage) {
    return protectedParts.map((part) => restoreTechnicalText(part, protectedValues));
  }

  const combined = protectedParts.join(`\n\n${FIELD_SEPARATOR}\n\n`);
  const result = initialResult || await requestTranslation(combined, sourceLanguage, targetLanguage);
  let translatedParts = result.text.split(FIELD_SEPARATOR_PATTERN);

  if (translatedParts.length !== protectedParts.length) {
    translatedParts = await Promise.all(
      protectedParts.map(async (part) => {
        const translated = await requestTranslation(part, sourceLanguage, targetLanguage);
        return translated.text;
      }),
    );
  }

  return translatedParts.map((part) => restoreTechnicalText(part, protectedValues));
}

function productFromParts(parts, specCount, tagCount) {
  let index = 0;
  const name = parts[index++];
  const summary = parts[index++];
  const specs = parts.slice(index, index + specCount);
  index += specCount;
  const tags = parts.slice(index, index + tagCount);
  return { name, summary, specs, tags };
}

export async function translateProduct(product) {
  const sourceParts = [product.name, product.summary, ...product.specs, ...product.tags];
  const { protectedParts, protectedValues } = protectTechnicalText(sourceParts, product.brand);
  const combined = protectedParts.join(`\n\n${FIELD_SEPARATOR}\n\n`);
  const initialAzerbaijani = await requestTranslation(combined, "auto", "az");
  const sourceLanguage = initialAzerbaijani.sourceLanguage || "en";

  const translatedEntries = await Promise.all(
    PRODUCT_LANGUAGES.map(async (language) => {
      const initialResult = language === "az" && sourceLanguage !== "az" ? initialAzerbaijani : null;
      const parts = await translateParts(
        protectedParts,
        protectedValues,
        sourceLanguage,
        language,
        initialResult,
      );
      return [language, productFromParts(parts, product.specs.length, product.tags.length)];
    }),
  );

  return {
    sourceLanguage,
    translations: Object.fromEntries(translatedEntries),
  };
}
