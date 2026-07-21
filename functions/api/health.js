import { errorResponse, json } from "../_lib/http.js";

export async function onRequestGet({ env }) {
  try {
    if (!env.DB) throw new Error("Missing DB binding");
    const result = await env.DB.prepare("SELECT 1 AS healthy").first();
    return json({
      status: result?.healthy === 1 ? "ok" : "degraded",
      database: result?.healthy === 1 ? "reachable" : "unavailable",
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
