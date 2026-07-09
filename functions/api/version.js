import { json } from "../_lib/http.js";

export function onRequestGet() {
  return json({
    version: "2026-07-10-seeded-owner-passwords",
  });
}
