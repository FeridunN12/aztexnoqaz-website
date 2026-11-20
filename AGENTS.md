# AzTexnoQaz website project continuity

When the owner asks to continue the "AC Tech Gas", "AZ Tech Gas", "Az Tech Gas",
"AzTexnoQaz", or "Aztexnogaz" website, they mean this existing project. Use these
details to resume work without asking them to identify the website again.

- Repository: https://github.com/FeridunN12/aztexnoqaz-website
- Production website: https://aztexnogaz.com/
- Cloudflare Pages project: `aztexnoqaz-website`
- Pages URL: https://aztexnoqaz-website.pages.dev/
- Production branch: `main`; pushes automatically trigger the existing
  Cloudflare Pages GitHub integration. Local edits alone do not deploy.
- Official Instagram: https://www.instagram.com/aztexnoqaz/ (`@aztexnoqaz`)
- Hidden editor login: `Ctrl+Shift+I` on computers (`Ctrl+Alt+E` also retained).
  Successful login restores the existing editor toolbar on future visits through
  the persistent secure session cookie. Logout hides it and closes the login dialog.
- Enelsan wordmark: `assets/brands/enelsan.png`, sourced from the manufacturer's
  `https://enelsan.com/Upload/Dosyalar/resim-png/logo-1-0bf08fc5-b8e4-4ef0-adc6-a14b9784d063.png`.

Preserve the existing site, content, 3D showcase, catalogue, staff workspace,
and functionality when the owner requests a small addition. Match the existing
design and keep public text working in Azerbaijani, English, Turkish, Russian,
and Georgian through `i18n.js`.

The frontend is static HTML/CSS/JavaScript with no frontend build step. Pages
Functions and D1 provide the catalogue, quotations, staff access, product-photo
uploads, and inventory workbook imports. Public quotation forms currently do
not retain document attachments; see the README limitations.

Run `npm test` and check the changed UI at desktop and mobile sizes. Keep the
versioned frontend and admin asset URLs consistent. When publishing is requested,
push the reviewed change to `main`, check the Cloudflare Pages commit check, and
verify the production page and `/api/health`. Preserve secrets and business data.

These repository notes provide project continuity when the repository is opened;
they do not create or guarantee account-level memory in unrelated chats.
