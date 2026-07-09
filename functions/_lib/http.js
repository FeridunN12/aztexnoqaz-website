export class ApiError extends Error {
  constructor(status, message, code = "request_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

export function errorResponse(error) {
  if (error instanceof ApiError) {
    return json({ error: error.message, code: error.code }, error.status);
  }

  console.error(error);
  return json({ error: "The server could not complete this request.", code: "server_error" }, 500);
}

export function requireSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new ApiError(403, "This request did not come from the website.", "invalid_origin");
  }
}

export async function readJson(request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(415, "Expected a JSON request.", "invalid_content_type");
  }

  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "The request body is not valid JSON.", "invalid_json");
  }
}
