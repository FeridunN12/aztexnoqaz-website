import { listProducts } from "../_lib/db.js";
import { errorResponse, json } from "../_lib/http.js";

export async function onRequestGet({ env }) {
  try {
    if (!env.DB) throw new Error("Missing DB binding");
    return json({ products: await listProducts(env.DB) });
  } catch (error) {
    return errorResponse(error);
  }
}
