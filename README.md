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
http://127.0.0.1:8792
```

For local editor access, seed a development-only account with a password hash
in the local D1 database. Never commit real passwords or password hashes.

## Cloudflare Pages Settings

Use Cloudflare Pages with GitHub integration.

- Framework preset: `None`
- Production branch: `main`
- Build command: leave empty
- Build output directory: `/`
- D1 binding: `DB` -> `aztexnogaz-catalog`
- Secret: `AUTH_PEPPER` -> at least 32 random characters
- Secret: `INITIAL_EDITOR_PASSWORD` -> temporary first-login password for the seeded owner accounts

Every push to the `main` branch should trigger a new Cloudflare Pages production deployment.

Editor accounts and peppered password verifiers are stored in D1. Keep
`AUTH_PEPPER` private and never commit the production value. Successful login
creates a revocable, `HttpOnly`, same-site device session that rolls forward
for one year. Every account has full product and user-management access.
Visitors without a valid session see only the public website.

The seeded owner accounts can use `INITIAL_EDITOR_PASSWORD` only until their
first successful login creates a stored password verifier. After the first
owner login works, remove `INITIAL_EDITOR_PASSWORD` from Cloudflare Pages.

## Updating The Website

Administrators can update products and user access from the website editor.
Changes are written directly to D1 and appear on the public catalog without a
new deployment.

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
