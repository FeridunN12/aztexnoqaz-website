import { authenticate } from "../../_lib/auth.js";
import { errorResponse } from "../../_lib/http.js";

export async function onRequest(context) {
  try {
    context.data.editor = await authenticate(context.request, context.env);
    return await context.next();
  } catch (error) {
    return errorResponse(error);
  }
}
