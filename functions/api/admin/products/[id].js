import {
  ensureProductTranslations,
  getProduct,
  productTranslationStatements,
  writeAudit,
} from "../../../_lib/db.js";
import {
  ApiError,
  errorResponse,
  json,
  readJson,
  requireSameOrigin,
} from "../../../_lib/http.js";
import {
  mediaKeyFromUrl,
  parseProductForm,
  parseTranslationOverrides,
  storeImage,
} from "../../../_lib/products.js";
import { translateProduct } from "../../../_lib/translate.js";

export async function onRequestPut({ request, env, data, params }) {
  let storedImage = null;
  try {
    requireSameOrigin(request);
    const id = String(params.id);
    const existing = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first();
    if (!existing) throw new ApiError(404, "This product no longer exists.", "not_found");

    const formData = await request.formData();
    const revision = Number(formData.get("revision"));
    if (!Number.isInteger(revision) || revision !== existing.version) {
      throw new ApiError(409, "This product changed in another session. Refresh and try again.", "conflict");
    }

    const product = parseProductForm(formData);
    const translationOverrides = parseTranslationOverrides(formData);
    const translatedProduct = await translateProduct(product);
    Object.assign(translatedProduct.translations, translationOverrides);
    const image = formData.get("image");
    let imageUrl = existing.image_url;
    if (image && typeof image.arrayBuffer === "function" && image.size) {
      storedImage = await storeImage(env.DB, image, id);
      imageUrl = storedImage.url;
    }

    const now = new Date().toISOString();
    await ensureProductTranslations(env.DB);
    const updateProduct = env.DB
      .prepare(
        `UPDATE products
         SET name = ?, brand = ?, category = ?, image_url = ?, summary = ?,
             specs_json = ?, tags_json = ?, version = version + 1,
             updated_at = ?, updated_by = ?
         WHERE id = ? AND version = ?`,
      )
      .bind(
        product.name,
        product.brand,
        product.category,
        imageUrl,
        product.summary,
        JSON.stringify(product.specs),
        JSON.stringify(product.tags),
        now,
        data.editor.email,
        id,
        revision,
      );
    const [result] = await env.DB.batch([
      updateProduct,
      ...productTranslationStatements(env.DB, id, translatedProduct, now),
    ]);

    if (!result.meta.changes) {
      throw new ApiError(409, "This product changed in another session. Refresh and try again.", "conflict");
    }

    const oldImageKey = mediaKeyFromUrl(existing.image_url);
    if (storedImage && oldImageKey) {
      await env.DB
        .prepare("DELETE FROM product_images WHERE image_key = ?")
        .bind(oldImageKey)
        .run()
        .catch(() => {});
    }

    await writeAudit(env.DB, data.editor.email, "update", "product", id, {
      name: product.name,
      imageChanged: Boolean(storedImage),
    });
    return json({ product: await getProduct(env.DB, id) });
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

export async function onRequestDelete({ request, env, data, params }) {
  try {
    requireSameOrigin(request);
    const id = String(params.id);
    const body = await readJson(request);
    const revision = Number(body.revision);
    const existing = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first();
    if (!existing) throw new ApiError(404, "This product no longer exists.", "not_found");
    if (!Number.isInteger(revision) || revision !== existing.version) {
      throw new ApiError(409, "This product changed in another session. Refresh and try again.", "conflict");
    }

    await ensureProductTranslations(env.DB);
    const [result] = await env.DB.batch([
      env.DB
        .prepare("DELETE FROM products WHERE id = ? AND version = ?")
        .bind(id, revision),
      env.DB
        .prepare("DELETE FROM product_translations WHERE product_id = ?")
        .bind(id),
    ]);
    if (!result.meta.changes) {
      throw new ApiError(409, "This product changed in another session. Refresh and try again.", "conflict");
    }

    const imageKey = mediaKeyFromUrl(existing.image_url);
    if (imageKey) {
      await env.DB
        .prepare("DELETE FROM product_images WHERE image_key = ?")
        .bind(imageKey)
        .run()
        .catch(() => {});
    }
    await writeAudit(env.DB, data.editor.email, "delete", "product", id, {
      name: existing.name,
    });
    return json({ deleted: true, id });
  } catch (error) {
    return errorResponse(error);
  }
}
