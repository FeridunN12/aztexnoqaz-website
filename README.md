# AzTexnoQaz Website

Static marketing and product catalog website for AzTexnoQaz LLC.

## Project Type

This is a simple static HTML/CSS/JavaScript website.

- Homepage: `index.html`
- Styles: `styles.css`
- JavaScript/product catalog: `script.js`
- Images and logo assets: `assets/`

There is no React, Vite, Next.js, Node build step, backend, API key, or environment variable required.

## Local Preview

From this folder, run:

```bash
python -m http.server 8787
```

Then open:

```text
http://127.0.0.1:8787
```

## Cloudflare Pages Settings

Use Cloudflare Pages with GitHub integration.

- Framework preset: `None`
- Production branch: `main`
- Build command: leave empty
- Build output directory: `/`
- Environment variables: none required

Every push to the `main` branch should trigger a new Cloudflare Pages production deployment.

## Updating The Website

1. Edit the website files.
2. Commit the changes.
3. Push to GitHub `main`.
4. Cloudflare Pages automatically builds and redeploys the live site.

## Custom Domain Later

After the site is deployed on Cloudflare Pages, add a custom domain from the Pages project:

```text
Workers & Pages -> your Pages project -> Custom domains -> Set up a custom domain
```

Cloudflare will show the DNS records needed for your `.com` domain.
