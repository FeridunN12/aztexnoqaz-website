# AzTexnoQaz Business Platform

AzTexnoQaz is a multilingual industrial product catalogue, official monthly
inventory import workflow, quotation system, and staff operations workspace.
The public website contains no generative AI features and does not display
invented inventory, prices, customer figures, or performance statistics.

Production: [https://aztexnogaz.com](https://aztexnogaz.com)

## Architecture

- Static public UI: `index.html`, `styles.css`, `i18n.js`, `script.js`
- Staff workspace: `admin.html`, `admin.css`, `admin.js`
- Cloudflare Pages Functions: `functions/`
- Cloudflare D1 database and migrations: `migrations/`
- Default catalogue seed: `data/products.json`
- Sanitized inventory fixture and tests: `tests/`
- Product images and approved brand assets: `assets/`

There is no frontend build step. Product edits, quotation requests, user
access, mappings, and inventory are stored in D1 and update without a code
deployment.

## Local Setup

Prerequisites are Node.js, Wrangler, Python 3, and a local D1 database.

```bash
npx wrangler d1 migrations apply DB --local
npx wrangler pages dev . --port 8792
```

Open `http://127.0.0.1:8792`. Run regression checks with:

```bash
npm test
```

## Cloudflare Configuration

Configure the Pages project with:

- Framework preset: `None`
- Production branch: `main`
- Build command: empty
- Build output directory: `/`
- D1 binding: `DB`
- `AUTH_PEPPER`: private random value of at least 32 characters
- `INITIAL_EDITOR_PASSWORD`: optional one-time bootstrap secret for initial
  owner records that do not yet have a password verifier

Apply D1 migrations before relying on new production features:

```bash
npx wrangler d1 migrations apply DB --remote
```

Never commit secrets, private workbook links, service-account credentials, or
database exports. Cloudflare Pages deploys pushes to `main` through the
existing GitHub integration.

## Authentication And Roles

Passwords are stored as salted PBKDF2-derived verifiers, optionally protected
with `AUTH_PEPPER`. Sessions use revocable, `HttpOnly`, `Secure`,
`SameSite=Strict` cookies. Login attempts are rate limited and state-changing
admin routes enforce same-origin requests.

Supported platform roles:

| Role | Access |
| --- | --- |
| Administrator | Products, inventory, quotations, users, and all workspace data |
| Product editor | Product and translation management |
| Sales | Quotation records and status workflow |
| Inventory manager | Imports, mappings, inventory, connectors, and rollback |
| Viewer | Read-only operational overview and inventory |

Legacy owner accounts receive the administrator role so existing access is not
silently removed. Removing the final administrator is blocked.

## Official Workbook Requirements

The importer was verified against the supplied July inventory report. It
detects these real headers instead of assuming fixed English names:

| Meaning | Confirmed workbook header | Confirmed column |
| --- | --- | --- |
| Product name | `Malların Adı` | C |
| Product code | `Malların Kodu` | D |
| Final warehouse quantity | `Son Anbar Qalığı Miqdarı` | AO |

Only product name, product code, final quantity, row identity, and validation
metadata are retained. Cost, warehouse value, accounting calculations, and all
other financial columns are ignored. The uploaded file itself is parsed in
memory and is not retained.

Workbook safety limits include:

- `.xlsx` extension and ZIP signature validation
- 5 MB upload limit
- 5,000 inventory-row limit
- 250 ZIP-entry limit
- 24 MB total uncompressed-entry limit
- ZIP expansion-ratio checks
- Required OOXML structure checks
- No formula execution
- Parsing-time guard

The original company workbook is confidential and is not in this repository.
`tests/fixtures/sanitized-inventory.xlsx` uses fake products with the same
required column positions.

## Manual Monthly Import

The currently operational update mode is secure manual upload:

1. Sign in at `/admin.html` as an administrator or inventory manager.
2. Open **Inventory imports**.
3. Choose the new official `.xlsx` report.
4. Confirm report month and year and optionally add an internal note.
5. Select **Validate and preview**.
6. Review invalid, unmatched, ambiguous, duplicate-code, missing-code, changed,
   unchanged, and missing-product counts.
7. Map valid rows, clear an incorrect saved mapping, or permanently exclude a
   source row.
8. Download the sanitized review CSV when errors need offline review.
9. Apply only after ambiguous rows are resolved and at least one row is mapped.
10. Review the resulting public availability and dashboard totals.

Applying an import uses one D1 batch transaction. The previous inventory is
captured in a snapshot first. A failed transaction preserves the last valid
inventory. Only the latest applied import can be rolled back, which prevents
history from being restored out of order.

## Product Matching

Workbook rows are matched in this order:

1. Confirmed saved source-row mapping
2. Unique internal product ID
3. Unique SKU
4. Previously confirmed workbook product code
5. Exact normalized model
6. Exact normalized product name
7. Manual review

Uncertain matches are never accepted with fuzzy matching. Multiple workbook
rows may be linked to one product only through confirmed mappings; their source
rows remain individually auditable before quantities are combined.

## Inventory Rules

The central `product_inventory` record drives public cards, product details,
availability filters, quotation stock context, inventory tables, and dashboard
counts.

- Quantity greater than zero: **In stock**
- Quantity equal to zero: **Out of stock**
- Quantity at or below a configured threshold: **Low stock**
- Missing mapping or missing row: **Contact for availability**
- No successful report: **Inventory information unavailable**

No low-stock threshold is invented. Product editors can configure a threshold,
whether exact quantity is public, and a documented availability override with
an optional expiration. The imported status remains visible internally when an
override is active.

Public wording for the current manual process is:

> Stock synchronized from the latest official monthly inventory report.

The site never calls a local attachment real-time inventory.

## Connected Workbook Interface

Manual import works now. The connector endpoint reports an honest
`not_configured` state until a real private source and credentials are supplied.
The same parser, validation, mapping, preview, confirmation, snapshot, and
rollback pipeline is designed for future OneDrive, SharePoint, Google Drive,
Google Sheets, accounting-system, or company-API adapters.

Activating automatic synchronization requires:

- A stable private file or API identifier
- An approved authentication method and server-side credentials
- Source metadata such as ETag, version ID, modified time, or checksum
- A Cloudflare scheduled Worker or equivalent daily scheduler
- Tested download, retry, and alert behavior

Only after that connection is configured and tested should the public wording
change to:

> Stock synchronized from the connected official inventory workbook.

A local file cannot update itself. Automatic synchronization is not claimed or
simulated in the current deployment.

## Quotations

Visitors can submit one or more products, quantities, contact information, and
project requirements. D1 stores a unique `AZQ-YYYYMM-NNNNNN` reference, request
language, product lines, inventory status at submission, and activity history.
Staff can search requests and move them through:

`New`, `Under review`, `Information required`, `Preparing quotation`, `Quoted`,
`Accepted`, `Rejected`, `Completed`, and `Archived`.

Current inventory is shown beside the submission-time status. Website
availability never reserves stock; staff confirm availability and technical
suitability during quotation.

## Multilingual Catalogue

Public navigation and product content support Azerbaijani, English, Turkish,
Russian, and Georgian. The selected language is stored locally and represented
by the `lang` URL parameter so product links preserve the current page and
language. Product editors can review every language separately. Manual edits
are preserved; resetting translations explicitly regenerates the other
languages from the selected source language.

Machine-generated text remains editable and should be reviewed before final
company publication.

## Import History, Retention, And Backup

The system stores sanitized import metadata, source rows, mappings, result
counts, snapshots, actor, dates, hash, and failure summary. It does not store the
original workbook or private financial columns.

Recommended operations:

- Export D1 before schema migrations and before major catalogue changes.
- Retain encrypted company copies of official workbooks outside the public
  repository and public assets.
- Test snapshot rollback with the sanitized fixture after infrastructure
  changes.
- Review failed imports and stale-report warnings in the staff workspace.
- Rotate `AUTH_PEPPER` only with a planned password migration.

## Security And Reliability

- Server-side role checks on every private route
- Same-origin enforcement for authenticated writes
- Secure cookies and revocable sessions
- Login and public quotation rate limits
- Length, type, identifier, and MIME validation
- Product image magic-byte validation and client-side normalization
- Workbook ZIP-bomb and path-traversal checks
- Formula-safe sanitized CSV exports
- Transactional inventory application and rollback snapshots
- Optimistic product revision checks
- Idempotency keys for interrupted product saves
- Security headers, CSP, clickjacking protection, and admin no-index rules
- `/api/health` health endpoint
- Audit records for product, account, import, mapping, and quotation actions

## SEO And Accessibility

The public site provides canonical metadata, Open Graph metadata, Organization
structured data, alternate-language links, `robots.txt`, and `sitemap.xml`.
Product query URLs are shareable and update page metadata in the browser.
Admin, API, import, and account surfaces are excluded from indexing.

Semantic headings, labels, native dialogs, keyboard navigation, visible focus,
status regions, alt text, reduced-motion handling, and responsive tables are
included. The layouts are designed for desktop, laptop, tablet, iPhone, and
Android widths.

## Tests

`npm test` runs:

- Availability-rule regression tests
- Azerbaijani normalization tests
- Header detection for columns C, D, and AO
- Quantity parsing and zero-stock handling
- Missing code, invalid quantity, and duplicate-row detection
- Incomplete workbook rejection
- Image signature validation
- Five-language configuration validation
- Full migration and private-schema smoke checks

Production QA should additionally exercise login, authorization, image upload,
product editing, quotation submission/status changes, import preview,
confirmation, rollback, language switching, and desktop/mobile layouts.

## Three-Minute Demonstration

1. Open the public catalogue and filter products by availability.
2. Open and share a product, showing its latest report date.
3. Submit a multi-product quotation and note the generated reference.
4. Sign in to `/admin.html` and open **Inventory imports**.
5. Upload `tests/fixtures/sanitized-inventory.xlsx`.
6. Review mapped, unmatched, invalid, and warning rows without applying them.
7. Map a fake row, apply the import, and show dashboard/inventory updates.
8. Return to the public product and show its updated availability.
9. Open the saved quotation, compare submitted and current stock status, and
   change the workflow status.
10. Roll back the fake import and explain that production currently uses
    reviewed monthly uploads; automatic cloud sync awaits a real connector.

## Known Limitations

- No cloud workbook source or credentials are currently configured, so daily
  automatic synchronization is intentionally inactive.
- The public product experience uses shareable query URLs rather than
  server-rendered per-product routes.
- Quotation document attachments are not retained yet; customers should send
  approved documents through the listed company contact channels.
- Historical inventory charts appear only after genuine successful monthly
  imports exist. No sample business metrics are inserted.
- A future accounting connector must reuse the validated import pipeline and
  must never expose cost or warehouse-value fields publicly.
