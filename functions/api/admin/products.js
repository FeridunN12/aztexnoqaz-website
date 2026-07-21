import {
  ensureCatalog,
  ensureProductDetails,
  ensureProductTranslations,
  getProduct,
  listProducts,
  productTranslationStatements,
  writeAudit,
} from "../../_lib/db.js";
import { errorResponse, json, requireSameOrigin } from "../../_lib/http.js";
import {
  completeTranslatedProduct,
  inventoryAvailabilityStatement,
  parseProductForm,
  parseProductDetails,
  parseTranslationOverrides,
  productDetailsStatement,
  storeImage,
  uniqueProductId,
  uniqueProductSlug,
} from "../../_lib/products.js";
import { translateProduct } from "../../_lib/translate.js";
import { requirePermission } from "../../_lib/platform.js";

export async function onRequestGet({ env, data }) {
  try {
    requirePermission(data.editor, "products");
    return json({ products: await listProducts(env.DB, { includeDrafts: true }) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPost({ request, env, data }) {
  let storedImage = null;
  try {
    requireSameOrigin(request);
    requirePermission(data.editor, "products");
    await ensureCatalog(env.DB);
    await ensureProductTranslations(env.DB);
    await ensureProductDetails(env.DB);
    const formData = await request.formData();
    const requestId = String(formData.get("requestId") || "").trim();
    const requestKey = /^[a-zA-Z0-9-]{8,100}$/.test(requestId)
      ? `product_request_${requestId}`
      : null;
    if (requestKey) {
      const previousRequest = await env.DB
        .prepare("SELECT value FROM catalog_metadata WHERE key = ?")
        .bind(requestKey)
        .first();
      if (previousRequest?.value) {
        const previousProduct = await getProduct(env.DB, previousRequest.value);
        if (previousProduct) return json({ product: previousProduct }, 200);
      }
    }
    const product = parseProductForm(formData);
    const details = parseProductDetails(formData, product.name);
    const translationOverrides = parseTranslationOverrides(formData);
    const translatedProduct = completeTranslatedProduct(formData, translationOverrides)
      || await translateProduct(product);
    if (translatedProduct.translations !== translationOverrides) {
      Object.assign(translatedProduct.translations, translationOverrides);
    }
    const id = await uniqueProductId(env.DB, product.name);
    const slug = await uniqueProductSlug(env.DB, details.requestedSlug);
    storedImage = await storeImage(env.DB, formData.get("image"), id);
    const orderRow = await env.DB
      .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM products")
      .first();
    const now = new Date().toISOString();

    const insertProduct = env.DB
      .prepare(
        `INSERT INTO products (
           id, name, brand, category, image_url, summary, specs_json, tags_json,
           sort_order, version, created_at, updated_at, updated_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      )
      .bind(
        id,
        product.name,
        product.brand,
        product.category,
        storedImage.url,
        product.summary,
        JSON.stringify(product.specs),
        JSON.stringify(product.tags),
        Number(orderRow?.next_order || 0),
        now,
        now,
        data.editor.email,
      );
    const statements = [
      insertProduct,
      productDetailsStatement(env.DB, id, details, slug, now, data.editor.email),
      inventoryAvailabilityStatement(env.DB, id, details.lowStockThreshold),
      ...productTranslationStatements(env.DB, id, translatedProduct, now),
    ];
    if (requestKey) {
      statements.push(
        env.DB
          .prepare("INSERT INTO catalog_metadata (key, value, updated_at) VALUES (?, ?, ?)")
          .bind(requestKey, id, now),
      );
    }
    await env.DB.batch(statements);

    await writeAudit(env.DB, data.editor.email, "create", "product", id, {
      name: product.name,
    });
    return json({ product: await getProduct(env.DB, id) }, 201);
  } catch (error) {
    if (storedImage?.key && env.DB) {
      await env.DB
        .prepare("DELETE FROM product_images WHERE image_key = ?")
        .bind(storedImage.key)
        .run()
        .catch(() => {});
    }
    return errorResponse(error);
  }
}
