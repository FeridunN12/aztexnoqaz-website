export function onRequestGet({ request }) {
  const url = new URL(request.url);
  return Response.redirect(`${url.origin}/?editor=1#products`, 302);
}
