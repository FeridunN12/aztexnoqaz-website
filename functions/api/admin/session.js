import { json } from "../../_lib/http.js";

export function onRequestGet({ data }) {
  return json({ editor: data.editor });
}
