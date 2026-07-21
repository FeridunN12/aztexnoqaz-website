# AzTexnoQaz Build Week Submission Package

## Project

**Title:** AzTexnoQaz Business Operations Platform

**Tagline:** A multilingual industrial catalogue that turns reviewed monthly
inventory reports into reliable availability and quotation workflows.

**Track:** Work and Productivity

## Problem

Industrial product information, monthly stock reports, website listings, and
quotation requests often live in disconnected systems. Manual copying creates
stale availability, weak traceability, and avoidable work for sales and
inventory staff. The source workbook also contains confidential financial
columns that must never be exposed through a public website.

## Solution

AzTexnoQaz combines a public five-language product catalogue with a secure
staff workspace. Authorized staff can upload the latest official `.xlsx`
report, preview validation results, map safe inventory rows to catalogue
products, confirm updates transactionally, review audit history, and roll back
the latest import. Visitors can request quotations and staff can manage those
requests with inventory context.

## Key Features

- Responsive public industrial product catalogue and product-detail links
- Azerbaijani, English, Turkish, Russian, and Georgian content
- Secure role-based staff workspace
- Defensive Excel validation with import preview and sanitized review export
- Persistent workbook mappings and monthly quantity replacement
- Inventory status, low-stock rules, snapshots, rollback, and audit history
- Saved quotation references and staff workflow statuses
- Multilingual product editing with preserved manual translations
- Sanitized demonstration workbook and automated regression tests

## Technical Implementation

The frontend is static HTML, CSS, and JavaScript. Cloudflare Pages Functions
provide authenticated APIs, Cloudflare D1 stores catalogue and operational
data, and database migrations define the schema. Cloudflare Pages deploys the
`main` branch from GitHub to the existing production domain.

## Codex And GPT-5.6

Codex and GPT-5.6 were used to inspect the existing codebase, analyze workbook
structure, implement and debug the import and quotation workflows, generate
migrations and tests, run production QA, and iterate on the responsive UI. All
work was directed, tested, and reviewed by the project owner. Development took
place across several Codex tasks.

## Honest Workflow And Limitations

The current production workflow is a reviewed monthly upload. A local Excel
attachment cannot update itself. Automatic synchronization is available only
after a real cloud source and credentials are configured. The original company
workbook and its confidential financial columns are not public or committed.

## Links

- Production: https://aztexnogaz.com
- Repository: https://github.com/FeridunN12/aztexnoqaz-website
- Demo video: https://youtu.be/ukhGKmaBr0g
- Primary Codex task: `019f4756-9cf8-7981-b909-06b854a6f278`

## Testing Instructions

1. Open the production site and switch languages.
2. Browse categories, filter products, and open a product detail.
3. Submit a quotation and retain the generated reference.
4. For authorized testing, sign in to `/admin.html`.
5. Upload `tests/fixtures/sanitized-inventory.xlsx` and inspect the preview.
6. Confirm that invalid, missing-code, duplicate, unmatched, and mapped rows are
   separated before any inventory change is allowed.
7. Run `npm test` locally for the parser, availability, translation, image, and
   migration regression suite.

## Acknowledgements

Built for OpenAI Build Week using Codex and GPT-5.6. Product and brand assets
belong to their respective owners and are used for the company's real product
catalogue. No invented customer, revenue, stock, certification, or performance
claims are included.
