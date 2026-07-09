# AzTexnoQaz Website

Marketing website and persistent product catalog for AzTexnoQaz LLC.

## Project Type

The public site uses static HTML, CSS, and JavaScript. Cloudflare Pages
Functions provide the catalog API and the authenticated editor workflow.

- Homepage: `index.html`
- Styles: `styles.css`
- Frontend/catalog editor: `script.js`
- Default catalog seed: `data/products.json`
- Pages Functions: `functions/`
- D1 migrations: `migrations/`
- Images and logo assets: `assets/`

There is no frontend build step.

## Local Preview

Apply the local D1 migrations, then run the Pages development server:

```bash
npx wrangler d1 migrations apply DB --local
npx wrangler pages dev . --port 8792
```

Then open:

```text
http://127.0.0.1:8792/?editor=1#products
```

For local editor access, use an ignored `wrangler.jsonc` with a `DB` D1
binding and `DEV_AUTH_EMAIL` set to an owner email. The development bypass is
accepted only on localhost.

## Cloudflare Pages Settings

Use Cloudflare Pages with GitHub integration.

- Framework preset: `None`
- Production branch: `main`
- Build command: leave empty
- Build output directory: `/`
- D1 binding: `DB` -> `aztexnogaz-catalog`
- Variable: `ACCESS_TEAM_DOMAIN`
- Variable: `ACCESS_AUD`

Every push to the `main` branch should trigger a new Cloudflare Pages production deployment.

Cloudflare Access protects only `aztexnogaz.com/api/admin/*`. Access performs
email authentication, and the application validates the Access JWT plus the
editor allowlist stored in D1.

## Updating The Website

Owners can update products and editor access from the website editor. Changes
are written directly to D1 and appear on the public catalog without a new
deployment.

Code changes still follow the normal deployment flow:

1. Edit and test the website files.
2. Commit the changes.
3. Push to GitHub `main`.
4. Cloudflare Pages automatically redeploys the live site.

## Production Domain

The production site is deployed through Cloudflare at:

```text
https://aztexnogaz.com
```

Pushes to the `main` branch publish to this domain through the connected Cloudflare Pages project.
