import { errorResponse, json, requireSameOrigin } from "../../_lib/http.js";
import { parseProductForm } from "../../_lib/products.js";
import { translateProduct } from "../../_lib/translate.js";

export async function onRequestPost({ request }) {
  try {
    requireSameOrigin(request);
    const product = parseProductForm(await request.formData());
    const translatedProduct = await translateProduct(product);
    return json(translatedProduct);
  } catch (error) {
    return errorResponse(error);
  }
}
