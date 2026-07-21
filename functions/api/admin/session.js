import { json } from "../../_lib/http.js";

export function onRequestGet({ data }) {
  return json({
    editor: {
      email: data.editor.email,
      role: data.editor.role,
      displayName: data.editor.displayName,
      deviceName: data.editor.deviceName,
      platform: data.editor.platform,
    },
  });
}
