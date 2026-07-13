import {
  ensureCatalog,
  ensureProductTranslations,
  getProduct,
  productTranslationStatements,
  writeAudit,
} from "../../_lib/db.js";
import { errorResponse, json, requireSameOrigin } from "../../_lib/http.js";
import {
  parseProductForm,
  storeImage,
  uniqueProductId,
} from "../../_lib/products.js";
import { translateProduct } from "../../_lib/translate.js";

export async function onRequestPost({ request, env, data }) {
  let storedImage = null;
  try {
    requireSameOrigin(request);
    await ensureCatalog(env.DB);
    const formData = await request.formData();
    const product = parseProductForm(formData);
    const translatedProduct = await translateProduct(product);
    const id = await uniqueProductId(env.DB, product.name);
    storedImage = await storeImage(env.DB, formData.get("image"), id);
    const orderRow = await env.DB
      .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM products")
      .first();
    const now = new Date().toISOString();

    await ensureProductTranslations(env.DB);
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
    await env.DB.batch([
      insertProduct,
      ...productTranslationStatements(env.DB, id, translatedProduct, now),
    ]);

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
