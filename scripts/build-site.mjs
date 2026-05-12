import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const ASSETS_SRC = path.join(ROOT, "assets");
const ASSETS_DEST = path.join(PUBLIC_DIR, "assets");

const SUPPORT_PAGES = [
  {
    file: "about.html",
    title: "About Smart Home Automation",
    description:
      "Learn how this smart home automation and security discovery website works, how products are organized, and how browsing, filtering, and scoring help users choose better items.",
    heading: "About this website",
    intro:
      "This platform is built as a premium smart home discovery engine, not just a simple affiliate listing site.",
  },
  {
    file: "contact.html",
    title: "Contact Smart Home Automation",
    description:
      "Contact the Smart Home Automation team for feedback, corrections, partnerships, or content suggestions.",
    heading: "Contact us",
    intro:
      "Use this page to reach the team for content updates, partnerships, corrections, or business inquiries.",
  },
  {
    file: "career.html",
    title: "Career at Smart Home Automation",
    description:
      "Explore career and collaboration opportunities at Smart Home Automation.",
    heading: "Career opportunities",
    intro:
      "This page can be used for future hiring, freelance collaborations, content editing, and technical support roles.",
  },
  {
    file: "privacy.html",
    title: "Privacy Policy",
    description:
      "Read the privacy policy for Smart Home Automation.",
    heading: "Privacy policy",
    intro:
      "This page explains how user data, cookies, and affiliate interactions are handled on the website.",
  },
  {
    file: "terms.html",
    title: "Terms and Conditions",
    description:
      "Read the terms and conditions for Smart Home Automation.",
    heading: "Terms and conditions",
    intro:
      "This page describes the rules and usage expectations for this website.",
  },
  {
    file: "disclaimer.html",
    title: "Disclaimer",
    description:
      "Read the affiliate and content disclaimer for Smart Home Automation.",
    heading: "Disclaimer",
    intro:
      "This page explains the affiliate, editorial, and informational nature of the website.",
  },
];

const PRIMARY_HTML_PAGES = [
  "index.html",
  "category.html",
  "product.html",
  "compare.html",
];

const EXTRA_COPY_FILES = [
  "site-config.json",
];

const SITE_URL =
  process.env.SITE_URL ||
  process.env.PUBLIC_SITE_URL ||
  process.env.URL ||
  "";

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function removeIfExists(filePath) {
  try {
    await fs.rm(filePath, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
}

async function copyDir(srcDir, destDir) {
  if (!(await exists(srcDir))) return;

  await ensureDir(destDir);
  const entries = await fs.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      await copyDir(src, dest);
    } else if (entry.isFile()) {
      await copyFile(src, dest);
    }
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pageShell({ title, description, heading, intro, bodyHtml }) {
  const ogImage = "assets/images/og-cover.jpg";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#0b0f17" />
  <meta name="color-scheme" content="dark light" />
  <meta name="robots" content="index,follow" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:url" content="./${escapeHtml(heading ? "" : "")}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${ogImage}" />
  <link rel="icon" href="assets/images/favicon.png" />
  <link rel="stylesheet" href="assets/css/style.css" />
</head>
<body>
  <a class="skip-link" href="#mainContent">Skip to content</a>

  <div class="site-shell">
    <header class="site-header" id="siteHeader">
      <div class="header-left">
        <a class="brand-mark" href="./" aria-label="Smart Home Automation home">
          <span class="brand-mark__logo" aria-hidden="true">S</span>
          <span class="brand-mark__text">
            <strong>Smart Home</strong>
            <small>Automation & Security</small>
          </span>
        </a>
      </div>

      <div class="header-center">
        <a class="compare-pill" href="compare.html" aria-label="Open compare page">
          <span>Compare</span>
          <strong>0</strong>
        </a>
      </div>

      <div class="header-right">
        <a class="icon-button" href="category.html" aria-label="Browse products">
          <span class="icon-search" aria-hidden="true"></span>
        </a>
      </div>
    </header>

    <main id="mainContent" class="main-content">
      <section class="hero" aria-label="${escapeHtml(heading)}">
        <div class="hero__slider">
          <article class="hero__slide" style="display: grid;">
            <div class="hero__content">
              <span class="hero__eyebrow">${escapeHtml(heading)}</span>
              <h1>${escapeHtml(heading)}</h1>
              <p>${escapeHtml(intro)}</p>
              <div class="hero__actions">
                <a class="primary-button" href="category.html">Browse Products</a>
                <a class="secondary-button" href="compare.html">Compare Items</a>
              </div>
            </div>
            <div class="hero__visual" aria-hidden="true">
              <div class="hero__card hero__card--large"></div>
              <div class="hero__card hero__card--small"></div>
            </div>
          </article>
        </div>
      </section>

      ${bodyHtml}
    </main>

     <footer class="site-footer">
      <div class="footer-grid">
        <div>
          <h2>Smart Home Automation</h2>
          <p>Product discovery and buying guidance for smart home automation and security items.</p>
        </div>

        <div>
          <h3>Pages</h3>
          <a href="about.html">About us</a>
          <a href="contact.html">Contact us</a>
          <a href="career.html">Career</a>
        </div>

        <div>
          <h3>Legal</h3>
          <a href="privacy.html">Privacy policy</a>
          <a href="terms.html">Terms</a>
          <a href="disclaimer.html">Disclaimer</a>
        </div>
      </div>

      <div class="footer-bottom">
        <p>All rights reserved.</p>
        <p>Design by Sukhdev Dahiya.</p>
      </div>
    </footer>
  </div>
</body>
</html>`;
}

function supportBody({ intro }) {
  return `
      <section class="search-section">
        <div class="section-head">
          <div>
            <span class="section-kicker">Overview</span>
            <h2>Why this page exists</h2>
          </div>
        </div>
        <p class="results-meta">${escapeHtml(intro)}</p>
      </section>

      <section class="guide-section">
        <div class="section-head">
          <div>
            <span class="section-kicker">Website model</span>
            <h2>How the platform is structured</h2>
          </div>
        </div>

        <div class="guide-grid">
          <article class="guide-card">
            <h3>Single source of truth</h3>
            <p>All item data is driven from one Google Sheet and converted into generated JSON files.</p>
          </article>
          <article class="guide-card">
            <h3>Premium discovery UX</h3>
            <p>The UI is designed for search, filters, compare flow, brand browsing, and editorial guidance.</p>
          </article>
          <article class="guide-card">
            <h3>SEO-first content</h3>
            <p>Each product can carry metadata, HTML content, schema, and rich descriptive copy for search visibility.</p>
          </article>
          <article class="guide-card">
            <h3>Affiliate-ready structure</h3>
            <p>Only a single affiliate link column is required so the same system can support any marketplace.</p>
          </article>
        </div>
      </section>

      <section class="footer-promo">
        <article class="promo-card">
          <h2>Built to scale cleanly</h2>
          <p>
            This site is designed to grow from a small catalog into a large smart-home discovery platform
            without changing the core data model.
          </p>
        </article>
      </section>
  `;
}

async function writeText(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, "utf8");
}

async function buildSupportPage(page) {
  const html = pageShell({
    title: page.title,
    description: page.description,
    heading: page.heading,
    intro: page.intro,
    bodyHtml: supportBody(page),
  });
  await writeText(path.join(PUBLIC_DIR, page.file), html);
}

async function build404Page() {
  const src = path.join(ROOT, "index.html");
  const dest = path.join(PUBLIC_DIR, "404.html");
  if (await exists(src)) {
    await copyFile(src, dest);
    return;
  }

  const html = pageShell({
    title: "Page not found",
    description: "The requested page could not be found.",
    heading: "Page not found",
    intro: "The page you are looking for does not exist.",
    bodyHtml: supportBody({
      intro: "The page you are looking for does not exist.",
    }),
  });
  await writeText(dest, html);
}

async function buildSitemap() {
  if (!SITE_URL || !/^https?:\/\//i.test(SITE_URL)) return;

  const urls = [
    "",
    "category.html",
    "product.html",
    "compare.html",
    "about.html",
    "contact.html",
    "career.html",
    "privacy.html",
    "terms.html",
    "disclaimer.html",
  ];

  const now = new Date().toISOString();
  const lines = urls
    .map((route) => {
      const loc = `${SITE_URL.replace(/\/+$/, "")}/${route}`.replace(/\/index\.html$/, "/");
      return `  <url><loc>${escapeHtml(loc)}</loc><lastmod>${now}</lastmod></url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${lines}
</urlset>
`;
  await writeText(path.join(PUBLIC_DIR, "sitemap.xml"), xml);

  const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL.replace(/\/+$/, "")}/sitemap.xml
`;
  await writeText(path.join(PUBLIC_DIR, "robots.txt"), robots);
}

async function copyPrimaryPages() {
  for (const fileName of PRIMARY_HTML_PAGES) {
    const src = path.join(ROOT, fileName);
    const dest = path.join(PUBLIC_DIR, fileName);

    if (await exists(src)) {
      await copyFile(src, dest);
    } else {
      console.warn(`[build-site] Missing ${fileName}; generating fallback page.`);
      const fallback = pageShell({
        title: fileName.replace(/\.html$/, "").toUpperCase(),
        description: "Smart home automation and security discovery page.",
        heading: fileName.replace(/\.html$/, ""),
        intro: "This page is part of the smart home discovery platform.",
        bodyHtml: supportBody({
          intro: "This page is part of the smart home discovery platform.",
        }),
      });
      await writeText(dest, fallback);
    }
  }
}

async function copyExtraFiles() {
  for (const fileName of EXTRA_COPY_FILES) {
    const src = path.join(ROOT, fileName);
    const dest = path.join(PUBLIC_DIR, fileName);
    if (await exists(src)) {
      await copyFile(src, dest);
    }
  }
}

async function copyAssets() {
  await removeIfExists(ASSETS_DEST);
  await copyDir(ASSETS_SRC, ASSETS_DEST);
}

async function createBuildMarkers() {
  await writeText(path.join(PUBLIC_DIR, ".nojekyll"), "");
}

async function main() {
  await ensureDir(PUBLIC_DIR);

  await copyPrimaryPages();
  await copyExtraFiles();
  await copyAssets();
  await build404Page();
  await buildSitemap();
  await createBuildMarkers();

  const jsonFiles = [
    "items.json",
    "item-map.json",
    "brands.json",
    "brand-map.json",
    "labels.json",
    "categories.json",
    "item-types.json",
    "subcategories.json",
    "banners.json",
    "search-index.json",
    "site-summary.json",
  ];

  for (const fileName of jsonFiles) {
    const filePath = path.join(PUBLIC_DIR, fileName);
    if (!(await exists(filePath))) {
      console.warn(`[build-site] Expected data file missing: ${fileName}`);
    }
  }

  console.log("[build-site] Site build complete.");
}

main().catch((error) => {
  console.error("\n[build-site] Build failed:\n");
  console.error(error);
  process.exit(1);
});
