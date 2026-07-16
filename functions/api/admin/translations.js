import { errorResponse, json, requireSameOrigin } from "../../_lib/http.js";
import { parseProductForm } from "../../_lib/products.js";
import { translateProduct } from "../../_lib/translate.js";

export async function onRequestPost({ request }) {
  try {
    requireSameOrigin(request);
    const formData = await request.formData();
    const product = parseProductForm(formData);
    const sourceLanguage = String(formData.get("sourceLanguage") || "").trim();
    const translatedProduct = await translateProduct(product, sourceLanguage);
    return json(translatedProduct);
  } catch (error) {
    return errorResponse(error);
  }
}
