import { authenticate, sessionCookie } from "../../_lib/auth.js";
import { errorResponse, json } from "../../_lib/http.js";

export async function onRequestGet({ request, env }) {
  try {
    const editor = await authenticate(request, env);
    return json(
      {
        editor: {
          email: editor.email,
          role: editor.role,
          displayName: editor.displayName,
          deviceName: editor.deviceName,
          platform: editor.platform,
        },
      },
      200,
      { "Set-Cookie": sessionCookie(editor.sessionToken) },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
