import { listProducts } from "../_lib/db.js";
import { errorResponse, json } from "../_lib/http.js";
import { toPublicCatalogProduct } from "../_lib/catalog-access.js";

export async function onRequestGet({ env }) {
  try {
    if (!env.DB) throw new Error("Missing DB binding");
    const products = (await listProducts(env.DB)).map(toPublicCatalogProduct);
    return json({
      products,
      catalog: {
        productCount: products.length,
        brandCount: new Set(products.map((product) => product.brand).filter(Boolean)).size,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
