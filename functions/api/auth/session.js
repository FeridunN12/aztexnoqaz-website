import { authenticate, sessionCookie } from "../../_lib/auth.js";
import { errorResponse, json } from "../../_lib/http.js";
import { ensureStaffProfile } from "../../_lib/platform.js";

export async function onRequestGet({ request, env }) {
  try {
    const editor = await authenticate(request, env);
    const platformRole = await ensureStaffProfile(env.DB, editor);
    return json(
      {
        editor: {
          email: editor.email,
          role: editor.role,
          displayName: editor.displayName,
          deviceName: editor.deviceName,
          platform: editor.platform,
          platformRole,
        },
      },
      200,
      { "Set-Cookie": sessionCookie(editor.sessionToken) },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
