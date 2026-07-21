import { getProduct } from "../../_lib/db.js";
import { ApiError, errorResponse, json } from "../../_lib/http.js";

export async function onRequestGet({ env, params }) {
  try {
    const product = await getProduct(env.DB, String(params.id));
    if (!product || product.publicationStatus !== "published") {
      throw new ApiError(404, "This product was not found.", "not_found");
    }
    return json({ product });
  } catch (error) {
    return errorResponse(error);
  }
}
