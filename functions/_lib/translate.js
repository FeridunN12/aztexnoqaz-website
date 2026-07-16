import { ApiError } from "./http.js";

export const PRODUCT_LANGUAGES = ["az", "en", "tr", "ru", "ka"];

const TRANSLATE_ENDPOINT = "https://translate.googleapis.com/translate_a/single";
const MYMEMORY_ENDPOINT = "https://api.mymemory.translated.net/get";
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

  let lastError = null;
  if (sourceLanguage !== "auto") {
    try {
      return {
        text: await requestMyMemoryTranslation(text, sourceLanguage, targetLanguage),
        sourceLanguage,
      };
    } catch (error) {
      lastError = error;
    }
  }

  const url = new URL(TRANSLATE_ENDPOINT);
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", sourceLanguage);
  url.searchParams.set("tl", targetLanguage);
  url.searchParams.set("dt", "t");

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

function splitTranslationText(text, maxLength = 450) {
  const chunks = [];
  let remaining = String(text);
  while (remaining.length > maxLength) {
    let splitAt = Math.max(
      remaining.lastIndexOf("\n", maxLength),
      remaining.lastIndexOf(". ", maxLength) + 1,
      remaining.lastIndexOf(" ", maxLength),
    );
    if (splitAt < Math.floor(maxLength * 0.5)) splitAt = maxLength;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function decodeTranslationEntities(value) {
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function requestMyMemoryTranslation(text, sourceLanguage, targetLanguage) {
  const chunks = splitTranslationText(text);
  const translatedChunks = [];
  for (const chunk of chunks) {
    const url = new URL(MYMEMORY_ENDPOINT);
    url.searchParams.set("q", chunk);
    url.searchParams.set("langpair", `${sourceLanguage}|${targetLanguage}`);
    url.searchParams.set("de", "aztexnogaz@gmail.com");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Fallback translation returned ${response.status}`);
      const payload = await response.json();
      const translated = payload?.responseData?.translatedText;
      if (!translated || Number(payload?.responseStatus || 200) >= 400) {
        throw new Error(payload?.responseDetails || "Fallback translation returned no text");
      }
      translatedChunks.push(decodeTranslationEntities(translated));
    } finally {
      clearTimeout(timeout);
    }
  }
  return translatedChunks.join("");
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

function normalizeAzerbaijaniText(value) {
  return String(value)
    .replace(/həcmi çeviricilər/gi, "korrektorlar")
    .replace(/həcmi çevirici/gi, "korrektor")
    .replace(/həcm çevirmə cihazları/gi, "həcm korrektorları")
    .replace(/həcm çevirmə cihazı/gi, "həcm korrektoru")
    .replace(/həcmin elektron çevrilməsi cihazı/gi, "elektron həcm korrektoru")
    .replace(/konvertor/gi, "korrektor")
    .replace(/qazlı su qızdırıcısı/gi, "kombi")
    .replace(/qazlı su isitmə qurğusu/gi, "kombi")
    .replace(/fırlanan qaz sayğacları/gi, "rotor tipli qaz sayğacları")
    .replace(/\bdönər\b/gi, "rotor")
    .replace(/\bsitat gətirin\b/gi, "qiymət təklifi hazırlayın")
    .replace(/\bsitat\b/gi, "qiymət təklifi")
    .replace(/\bkotirovka\b/gi, "qiymət təklifi");
}

function normalizeAzerbaijaniProduct(product, translation) {
  const normalized = {
    name: normalizeAzerbaijaniText(translation.name),
    summary: normalizeAzerbaijaniText(translation.summary),
    specs: translation.specs.map(normalizeAzerbaijaniText),
    tags: translation.tags.map(normalizeAzerbaijaniText),
  };
  const sourceName = String(product.name || "").toLowerCase();

  if (sourceName.includes("homeyway") && sourceName.includes("water heater")) {
    normalized.name = "Homeyway Kombi";
    normalized.tags = ["Kombi", "İsti su", "Homeyway"];
  } else if (sourceName.includes("airfel") && sourceName.includes("daikin") && sourceName.includes("water heater")) {
    normalized.name = "Airfel / Daikin Kombi";
    normalized.tags = ["Kombi", "Daikin", "Airfel"];
  } else if (sourceName.includes("macbat") && sourceName.includes("converter")) {
    normalized.name = "Plum MacBAT 5 Korrektor";
    normalized.tags = ["Korrektor", "Avtomatlaşdırma", "Plum GAS"];
  } else if (sourceName.includes("honeywell") && sourceName.includes("volume converter")) {
    normalized.name = "Elster Honeywell Korrektorları";
    normalized.tags = ["Korrektor", "Honeywell", "Elster"];
  } else if (sourceName.includes("rotary gas meter")) {
    normalized.name = "Elster Rotor Tipli Qaz Sayğacları";
    normalized.tags = ["Rotor", "Elster", "Qaz sayğacı"];
  } else if (sourceName.includes("fmg") && sourceName.includes("flow meter")) {
    normalized.name = "FMG Rotor Tipli Qaz Sayğacı";
    normalized.tags = ["Qaz sayğacı", "Rotor", "FMG"];
  } else if (sourceName.includes("fangaz") && sourceName.includes("industrial regulator")) {
    normalized.name = "FANGAZ Qaz Tənzimləyiciləri";
    normalized.tags = ["Qaz", "FANGAZ", "Tənzimləyici"];
  } else if (sourceName.includes("fangaz") && sourceName.includes("red") && sourceName.includes("regulator")) {
    normalized.name = "FANGAZ Qaz Tənzimləyicisi";
    normalized.tags = ["Tənzimləyici", "FANGAZ", "Qaz"];
  } else if (sourceName.includes("eska") && sourceName.includes("valve showcase")) {
    normalized.name = "ESKA Elektromaqnit Klapan";
    normalized.tags = ["Elektromaqnit klapan", "ESKA", "Qaz"];
  }

  return normalized;
}

export async function translateProduct(product, requestedSourceLanguage = "") {
  const sourceParts = [product.name, product.summary, ...product.specs, ...product.tags];
  const { protectedParts, protectedValues } = protectTechnicalText(sourceParts, product.brand);
  const combined = protectedParts.join(`\n\n${FIELD_SEPARATOR}\n\n`);
  const explicitSourceLanguage = PRODUCT_LANGUAGES.includes(requestedSourceLanguage)
    ? requestedSourceLanguage
    : null;
  const initialAzerbaijani = explicitSourceLanguage
    ? null
    : await requestTranslation(combined, "auto", "az");
  const sourceLanguage = explicitSourceLanguage || initialAzerbaijani?.sourceLanguage || "en";

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

  const translations = Object.fromEntries(translatedEntries);
  if (sourceLanguage !== "az") {
    translations.az = normalizeAzerbaijaniProduct(product, translations.az);
  }

  return {
    sourceLanguage,
    translations,
  };
}
