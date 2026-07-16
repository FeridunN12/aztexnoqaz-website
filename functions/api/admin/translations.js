import { ApiError, errorResponse, json, requireSameOrigin } from "../../_lib/http.js";
import { parseProductForm } from "../../_lib/products.js";
import { translateProduct } from "../../_lib/translate.js";

export async function onRequestPost({ request }) {
  try {
    requireSameOrigin(request);
    const product = parseProductForm(await request.formData());
    const translatedProduct = await translateProduct(product);
    return json(translatedProduct);
  } catch (error) {
    if (!(error instanceof ApiError)) {
      return json(
        {
          error: `Translation engine failed: ${String(error?.message || "unknown error")}`,
          code: "translation_server_error",
        },
        500,
      );
    }
    return errorResponse(error);
  }
}
