import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");

const DEFAULT_CONFIG = {
  source: {
    sheetId: "19H6vcik2wuqTlbV9UwRR0pnW7B4WEoJl",
    mainTab: "Items",
  },
};

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJson(filePath, fallback) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function decodeHtmlEntities(text) {
  return String(text ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out;
}

function parseCsv(text) {
  const cleaned = String(text || "").replace(/^\uFEFF/, "").trim();
  if (!cleaned) return [];

  const lines = cleaned.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];

  const headers = splitCsvLine(lines.shift()).map((header) =>
    String(header || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
  );

  return lines.map((line) => {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = decodeHtmlEntities((values[index] ?? "").trim());
    });
    return row;
  });
}

function safeJsonParse(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function normalizeImages(value) {
  const arr = Array.isArray(value) ? value : safeJsonParse(value, []);
  if (!Array.isArray(arr)) return [];
  return arr
    .map((img) => {
      if (!img || typeof img !== "object") return null;
      return {
        url: img.url || img.src || "",
        alt: img.alt || img.title || img.caption || "",
        title: img.title || "",
        caption: img.caption || "",
        license: img.license || "",
      };
    })
    .filter(Boolean);
}

function normalizeItemRow(row) {
  const itemName = row.item_name || row.name || row.title || "";
  const brandName = row.brand_name || "";
  const itemType = row.item_type || row.category || "";
  const category = row.category || row.item_type || "";
  const subcategory = row.subcategory || "";
  const images = normalizeImages(row.images_json);
  const specs = safeJsonParse(row.specs_json, {});
  const schema = safeJsonParse(row.schema_jsonld, null);
  const breadcrumb = safeJsonParse(row.breadcrumb_jsonld, null);
  const faq = safeJsonParse(row.faq_jsonld, null);
  const slug = row.slug || slugify(itemName);
  const brandSlug = row.brand_slug || slugify(brandName);

  return {
    item_id: row.item_id || row.id || slug,
    status: row.status || "active",
    brand_name: brandName,
    brand_slug: brandSlug,
    item_type: itemType,
    category,
    subcategory,
    item_name: itemName,
    slug,
    short_summary: row.short_summary || "",
    price: row.price ?? "",
    currency: row.currency || "INR",
    price_band: row.price_band || "",
    affiliate_platform: row.affiliate_platform || "",
    affiliate_url: row.affiliate_url || "",
    primary_image_url: row.primary_image_url || images[0]?.url || "",
    primary_image_alt: row.primary_image_alt || images[0]?.alt || itemName || "",
    images_json: images,
    key_features: row.key_features || "",
    specs_json: specs,
    use_cases: row.use_cases || "",
    html: row.html || "",
    meta_title: row.meta_title || "",
    meta_description: row.meta_description || "",
    h1: row.h1 || itemName,
    canonical_url: row.canonical_url || "",
    robots_meta: row.robots_meta || "index,follow",
    og_title: row.og_title || "",
    og_description: row.og_description || "",
    og_image: row.og_image || row.primary_image_url || images[0]?.url || "",
    twitter_card_type: row.twitter_card_type || "summary_large_image",
    twitter_title: row.twitter_title || "",
    twitter_description: row.twitter_description || "",
    twitter_card_image: row.twitter_card_image || row.primary_image_url || images[0]?.url || "",
    primary_keyword: row.primary_keyword || "",
    secondary_keywords: row.secondary_keywords || "",
    search_intent: row.search_intent || "",
    schema_jsonld: schema,
    breadcrumb_jsonld: breadcrumb,
    faq_jsonld: faq,
    featured_score: Number(row.featured_score || 0) || 0,
    updated_at: row.updated_at || "",
    search_text: [
      itemName,
      brandName,
      itemType,
      category,
      subcategory,
      row.short_summary,
      row.key_features,
      row.use_cases,
      row.meta_title,
      row.meta_description,
      row.primary_keyword,
      row.secondary_keywords,
      row.search_intent,
      JSON.stringify(specs),
      row.html,
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim(),
  };
}

function normalizeBrandEntry(entry) {
  const brandName = entry.brand_name || entry.title || entry.name || "";
  const brandSlug = entry.brand_slug || slugify(brandName);
  return {
    brand_name: brandName,
    brand_slug: brandSlug,
    brand_logo_url: entry.brand_logo_url || entry.logo_url || "",
    brand_page_title: entry.brand_page_title || brandName,
    brand_page_description: entry.brand_page_description || entry.description || "",
  };
}

function normalizeLabelEntry(entry) {
  const key = entry.key || entry.slug || entry.label || "";
  return {
    key,
    title: entry.title || key,
    order: Number(entry.order || 0) || 0,
    page_title: entry.page_title || "",
    page_description: entry.page_description || "",
  };
}

function normalizeBannerEntry(entry) {
  return {
    title: entry.title || "",
    subtitle: entry.subtitle || "",
    image: entry.image || entry.image_url || "",
    ctaText: entry.ctaText || entry.cta_text || "",
    ctaLink: entry.ctaLink || entry.cta_link || "",
  };
}

function uniqueSorted(values) {
  return Array.from(
    new Set(
      (values || [])
        .map((v) => String(v || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
}

async function fetchItemsFromSheet(config) {
  const sheetId = config?.source?.sheetId || DEFAULT_CONFIG.source.sheetId;
  const tab = config?.source?.mainTab || DEFAULT_CONFIG.source.mainTab;
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;

  const response = await fetch(url, {
    headers: {
      accept: "text/csv,*/*",
      "user-agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sheet tab "${tab}" from Google Sheets: ${response.status} ${response.statusText}`);
  }

  const csv = await response.text();
  return parseCsv(csv);
}

async function writeJson(fileName, data) {
  await fs.writeFile(path.join(PUBLIC_DIR, fileName), JSON.stringify(data, null, 2), "utf8");
}

async function main() {
  await ensureDir(PUBLIC_DIR);

  const siteConfig = await readJson(path.join(ROOT, "site-config.json"), DEFAULT_CONFIG);

  const [itemRows, brandConfig, labelConfig, bannerConfig, categoryMap] = await Promise.all([
    fetchItemsFromSheet(siteConfig),
    readJson(path.join(DATA_DIR, "brands.json"), { order: [], brands: {} }),
    readJson(path.join(DATA_DIR, "labels.json"), { order: [], labels: {} }),
    readJson(path.join(DATA_DIR, "banners.json"), []),
    readJson(path.join(DATA_DIR, "category-map.json"), {}),
  ]);

  const items = itemRows.map(normalizeItemRow).filter(Boolean);
  const brands = [];
  const brandMap = {};
  if (brandConfig && typeof brandConfig === "object") {
    const entries = brandConfig.brands && typeof brandConfig.brands === "object"
      ? Object.entries(brandConfig.brands)
      : [];
    const ordered = Array.isArray(brandConfig.order) ? brandConfig.order : [];
    const sortSource = ordered.length ? ordered : entries.map(([k]) => k);
    for (const key of sortSource) {
      const value = (brandConfig.brands || {})[key];
      if (!value) continue;
      const normalized = normalizeBrandEntry(value);
      brands.push(normalized);
      brandMap[normalized.brand_slug] = normalized;
    }
  }

  const labels = [];
  if (labelConfig && typeof labelConfig === "object") {
    const entries = labelConfig.labels && typeof labelConfig.labels === "object"
      ? Object.entries(labelConfig.labels)
      : [];
    const ordered = Array.isArray(labelConfig.order) ? labelConfig.order : entries.map(([k]) => k);
    for (const key of ordered) {
      const value = (labelConfig.labels || {})[key];
      if (!value) continue;
      labels.push(normalizeLabelEntry({ key, ...value }));
    }
  }

  const banners = Array.isArray(bannerConfig) ? bannerConfig.map(normalizeBannerEntry) : [];
  const categories = uniqueSorted(items.map((item) => item.category));
  const itemTypes = uniqueSorted(items.map((item) => item.item_type));
  const subcategories = uniqueSorted(items.map((item) => item.subcategory));

  const itemMap = {};
  for (const item of items) itemMap[item.slug] = item;

  const searchIndex = items.map((item) => ({
    item_id: item.item_id,
    slug: item.slug,
    item_name: item.item_name,
    brand_name: item.brand_name,
    brand_slug: item.brand_slug,
    item_type: item.item_type,
    category: item.category,
    subcategory: item.subcategory,
    price: item.price,
    currency: item.currency,
    price_band: item.price_band,
    affiliate_platform: item.affiliate_platform,
    primary_image_url: item.primary_image_url,
    featured_score: item.featured_score,
    status: item.status,
    search_text: item.search_text,
  }));

  const summary = {
    site_name: siteConfig?.site?.name || "Smart Home Automation",
    site_short_name: siteConfig?.site?.shortName || "Smart Home",
    tagline: siteConfig?.site?.tagline || "",
    description: siteConfig?.site?.description || "",
    design_by: siteConfig?.site?.designBy || "",
    content_model: {
      source_of_truth: "single_google_sheet",
      item_pages: true,
      brand_pages: true,
      category_pages: true,
      label_pages: true,
      comparison_page: true,
      guide_pages: true,
    },
    data_rules: {
      primary_item_tab: siteConfig?.source?.mainTab || "Items",
      brand_config_file: "data/brands.json",
      label_config_file: "data/labels.json",
      banner_config_file: "data/banners.json",
      seo_in_html_column: true,
      single_affiliate_url_column: true,
      multiple_images_via_json: true,
    },
    browser_experience: {
      hero_autoplay_ms: siteConfig?.ui?.heroAutoplayDelay || 5000,
      hero_manual_pause_ms: siteConfig?.ui?.heroManualPauseDelay || 10000,
      initial_cards: siteConfig?.ui?.initialPageSize || 12,
      load_more_cards: siteConfig?.ui?.loadMorePageSize || 12,
      compare_limit: siteConfig?.ui?.compareMaxItems || 4,
      search_across_all_fields: true,
      fuzzy_search_enabled: true,
    },
    seo_strategy: {
      meta_title_supported: true,
      meta_description_supported: true,
      open_graph_supported: true,
      twitter_cards_supported: true,
      product_schema_supported: true,
      breadcrumb_schema_supported: true,
      faq_schema_supported: true,
      discover_friendly_content: true,
    },
    taxonomy: {
      label_source_fields: ["item_type", "category", "subcategory"],
      brand_source_field: "brand_name",
      filter_fields: [
        "brand",
        "item_type",
        "category",
        "subcategory",
        "price_band",
        "affiliate_platform",
        "compatibility",
        "use_case",
      ],
    },
    build: {
      output_dir: "public",
      generated_files: [
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
        "category-map.json",
      ],
    },
    theme: {
      style: "premium_glass",
      mode: "dark",
      layout: "editorial_catalog",
      card_style: "premium_product_card",
      brand_strip: "horizontal_scroll",
      grid_style: "load_more",
    },
    status: {
      version: "1.0.0",
      generated_at: new Date().toISOString(),
      notes: "This file acts as a human-readable site manifest and can be updated when the strategy changes.",
    },
  };

  await writeJson("items.json", items);
  await writeJson("item-map.json", itemMap);
  await writeJson("brands.json", brands);
  await writeJson("brand-map.json", brandMap);
  await writeJson("labels.json", labels.sort((a, b) => a.order - b.order));
  await writeJson("categories.json", categories);
  await writeJson("item-types.json", itemTypes);
  await writeJson("subcategories.json", subcategories);
  await writeJson("banners.json", banners);
  await writeJson("search-index.json", searchIndex);
  await writeJson("site-summary.json", summary);
  await writeJson("category-map.json", categoryMap || {});
  console.log(`[build-json] wrote ${items.length} items`);
}

main().catch((error) => {
  console.error("\n[build-json] Build failed:\n");
  console.error(error);
  process.exit(1);
});
