import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { translateProduct } from "../functions/_lib/translate.js";

const SITE_URL = process.env.PRODUCT_SOURCE_URL || "https://aztexnogaz.com/api/products";
const OUTPUT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../data/product-translations.json");
const WORKER_COUNT = 2;

const response = await fetch(SITE_URL, { headers: { Accept: "application/json" } });
if (!response.ok) throw new Error(`Could not load products: ${response.status}`);

const payload = await response.json();
const products = Array.isArray(payload.products) ? payload.products : [];
if (!products.length) throw new Error("The product API returned no products");

const translatedProducts = new Array(products.length);
let nextIndex = 0;

async function worker() {
  while (nextIndex < products.length) {
    const index = nextIndex;
    nextIndex += 1;
    const product = products[index];
    console.log(`[${index + 1}/${products.length}] Translating ${product.id}`);
    const translated = await translateProduct(product);
    translatedProducts[index] = {
      id: product.id,
      revision: product.revision,
      sourceLanguage: translated.sourceLanguage,
      translations: translated.translations,
    };
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
}

await Promise.all(Array.from({ length: WORKER_COUNT }, () => worker()));
await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(
  OUTPUT_PATH,
  `${JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), products: translatedProducts }, null, 2)}\n`,
  "utf8",
);

console.log(`Wrote ${translatedProducts.length} translated products to ${OUTPUT_PATH}`);
