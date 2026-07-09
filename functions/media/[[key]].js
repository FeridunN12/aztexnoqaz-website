export async function onRequestGet({ env, params }) {
  const segments = Array.isArray(params.key) ? params.key : [params.key];
  const key = segments.map(decodeURIComponent).join("/");
  if (!key || key.includes("/") || key.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const image = await env.DB
    .prepare("SELECT content_type, body FROM product_images WHERE image_key = ?")
    .bind(key)
    .first();
  if (!image) return new Response("Not found", { status: 404 });

  const headers = new Headers({
    "Content-Type": image.content_type,
  });
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(image.body, { headers });
}
