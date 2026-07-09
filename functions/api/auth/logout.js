import { clearSessionCookie, deleteEditorSession } from "../../_lib/auth.js";
import { errorResponse, json, requireSameOrigin } from "../../_lib/http.js";

export async function onRequestPost({ request, env }) {
  try {
    requireSameOrigin(request);
    await deleteEditorSession(env.DB, request);
    return json({ signedOut: true }, 200, { "Set-Cookie": clearSessionCookie() });
  } catch (error) {
    return errorResponse(error);
  }
}
