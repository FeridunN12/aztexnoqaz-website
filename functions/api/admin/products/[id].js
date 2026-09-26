import {
  ensureProductDetails,
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
  completeTranslatedProduct,
  inventoryAvailabilityStatement,
  mediaKeyFromUrl,
  parseProductDetails,
  parseProductForm,
  parseTranslationOverrides,
  productDetailsStatement,
  storeImage,
  uniqueProductSlug,
} from "../../../_lib/products.js";
import { translateProduct } from "../../../_lib/translate.js";
import { requirePermission } from "../../../_lib/platform.js";

export async function onRequestPut({ request, env, data, params }) {
  let storedImage = null;
  try {
    requireSameOrigin(request);
    requirePermission(data.editor, "products");
    const id = String(params.id);
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
      if (previousRequest?.value === id) {
        const previousProduct = await getProduct(env.DB, id);
        if (previousProduct) return json({ product: previousProduct });
      }
    }
    const existing = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first();
    if (!existing) throw new ApiError(404, "This product no longer exists.", "not_found");

    const revision = Number(formData.get("revision"));
    if (!Number.isInteger(revision) || revision !== existing.version) {
      throw new ApiError(409, "This product changed in another session. Refresh and try again.", "conflict");
    }

    const product = parseProductForm(formData);
    const details = parseProductDetails(formData, product.name);
    const slug = await uniqueProductSlug(env.DB, details.requestedSlug, id);
    const translationOverrides = parseTranslationOverrides(formData);
    const translatedProduct = completeTranslatedProduct(formData, translationOverrides)
      || await translateProduct(product);
    if (translatedProduct.translations !== translationOverrides) {
      Object.assign(translatedProduct.translations, translationOverrides);
    }
    const image = formData.get("image");
    let imageUrl = existing.image_url;
    if (image && typeof image.arrayBuffer === "function" && image.size) {
      storedImage = await storeImage(env.DB, image, id);
      imageUrl = storedImage.url;
    }

    const now = new Date().toISOString();
    const existingDetails = await env.DB
      .prepare("SELECT * FROM product_catalog_details WHERE product_id = ?")
      .bind(id)
      .first();
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
    const statements = [
      updateProduct,
      env.DB
        .prepare(
          `INSERT INTO product_revisions (
             product_id, version, snapshot_json, created_at, created_by
           ) VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          revision,
          JSON.stringify({ product: existing, details: existingDetails }),
          now,
          data.editor.email,
        ),
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
    const [result] = await env.DB.batch(statements);

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
    requirePermission(data.editor, "products");
    const id = String(params.id);
    const body = await readJson(request);
    const revision = Number(body.revision);
    const existing = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first();
    if (!existing) throw new ApiError(404, "This product no longer exists.", "not_found");
    if (!Number.isInteger(revision) || revision !== existing.version) {
      throw new ApiError(409, "This product changed in another session. Refresh and try again.", "conflict");
    }

    await ensureProductTranslations(env.DB);
    await ensureProductDetails(env.DB);
    const results = await env.DB.batch([
      env.DB
        .prepare("DELETE FROM product_translations WHERE product_id = ?")
        .bind(id),
      env.DB.prepare("DELETE FROM inventory_mappings WHERE product_id = ?").bind(id),
      env.DB.prepare("DELETE FROM product_inventory WHERE product_id = ?").bind(id),
      env.DB.prepare("DELETE FROM product_catalog_details WHERE product_id = ?").bind(id),
      env.DB.prepare("UPDATE quotation_items SET product_id = NULL WHERE product_id = ?").bind(id),
      env.DB
        .prepare("DELETE FROM products WHERE id = ? AND version = ?")
        .bind(id, revision),
    ]);
    const result = results.at(-1);
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
