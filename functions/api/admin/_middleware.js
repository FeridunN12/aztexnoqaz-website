import { authenticate } from "../../_lib/auth.js";
import { errorResponse } from "../../_lib/http.js";
import { ensureStaffProfile } from "../../_lib/platform.js";

export async function onRequest(context) {
  try {
    context.data.editor = await authenticate(context.request, context.env);
    context.data.editor.platformRole = await ensureStaffProfile(
      context.env.DB,
      context.data.editor,
    );
    return await context.next();
  } catch (error) {
    return errorResponse(error);
  }
}
