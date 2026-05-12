# Smart Home Automation

A premium smart home automation and security product discovery website powered by one Google Sheet, build-time JSON generation, and a static GitHub Pages deployment pipeline.

## What this project does

This site is designed to help users browse smart home products in a more useful way than a basic affiliate listing. It supports:

- one-sheet content management
- SEO-friendly item pages
- brand browsing
- label browsing from item type and category
- advanced search across product text
- load-more grids
- product comparison
- affiliate purchase buttons
- premium glass-style UI

## Data flow

Google Sheet → `scripts/build-json.mjs` → generated JSON in `public/` → `scripts/build-site.mjs` → static website output

The Google Sheet is the single source of truth for product data. The website reads generated JSON files, not the raw sheet directly.

## Main files

- `site-config.json` — site settings, routes, filters, SEO defaults, and source config
- `package.json` — build scripts
- `scripts/build-json.mjs` — converts Google Sheet rows into JSON files
- `scripts/build-site.mjs` — builds the final static site into `public/`
- `assets/js/config.js` — frontend constants
- `assets/js/utils.js` — shared helpers
- `assets/js/api.js` — data loader and search helpers
- `assets/js/render.js` — DOM rendering helpers
- `assets/js/app.js` — page behavior and interactions
- `assets/css/style.css` — premium visual system
- `.github/workflows/pages-deploy.yml` — GitHub Pages deployment workflow

## Pages

- `index.html`
- `category.html`
- `product.html`
- `compare.html`
- `about.html`
- `contact.html`
- `career.html`
- `privacy.html`
- `terms.html`
- `disclaimer.html`

## Google Sheet structure

The website expects one main sheet tab named `Items` with columns for:

- item identity
- brand information
- category and subcategory
- SEO fields
- HTML content
- images JSON
- specs JSON
- use cases
- affiliate URL
- schema JSON-LD
- score
- updated time

### Important note

The following columns are especially important:

- `item_name`
- `brand_name`
- `brand_slug`
- `item_type`
- `category`
- `subcategory`
- `short_summary`
- `html`
- `meta_title`
- `meta_description`
- `h1`
- `affiliate_url`
- `primary_image_url`
- `images_json`
- `specs_json`
- `schema_jsonld`
- `breadcrumb_jsonld`
- `faq_jsonld`
- `featured_score`

## Optional local config files

The build currently supports these local JSON files in `data/`:

- `data/brands.json`
- `data/labels.json`
- `data/banners.json`

These files control brand strip ordering, label order, and hero banners.

## Build commands

Install dependencies:

```bash
npm install
