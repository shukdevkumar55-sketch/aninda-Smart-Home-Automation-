import { CONFIG, getDataUrl } from "./config.js";
import {
  arrayify,
  normalizeText,
  safeJsonParse,
  slugify,
  sortItems,
  uniqueStrings,
  scoreMatch,
} from "./utils.js";

const DATA_CACHE = {
  all: null,
  byKey: new Map(),
};

function resolveUrlCandidate(pathValue) {
  const raw = String(pathValue || "").trim();
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) return raw;

  const candidates = [raw];
  if (raw.startsWith("./")) candidates.push(raw.replace(/^\.\//, ""));
  if (raw.startsWith("/")) candidates.push(raw.slice(1));
  if (!raw.startsWith("public/")) candidates.push(`public/${raw}`);

  return candidates[0];
}

async function fetchJson(pathValue, fallback) {
  const rawPath = String(pathValue || "").trim();
  if (!rawPath) return fallback;

  const candidates = [];

  if (/^https?:\/\//i.test(rawPath)) {
    candidates.push(rawPath);
  } else {
    candidates.push(rawPath);
    if (rawPath.startsWith("./")) candidates.push(rawPath.replace(/^\.\//, ""));
    if (rawPath.startsWith("/")) candidates.push(rawPath.slice(1));
    if (!rawPath.startsWith("public/")) candidates.push(`public/${rawPath}`);
  }

  let lastError = null;

  for (const candidate of uniqueStrings(candidates)) {
    try {
      const response = await fetch(candidate, {
        cache: "no-store",
        headers: {
          accept: "application/json,text/plain,*/*",
        },
      });

      if (!response.ok) {
        lastError = new Error(`Failed to fetch ${candidate}: ${response.status} ${response.statusText}`);
        continue;
      }

      const text = await response.text();
      if (!text.trim()) return fallback;

      try {
        return JSON.parse(text);
      } catch {
        lastError = new Error(`Invalid JSON from ${candidate}`);
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    console.warn("[api] JSON fetch failed:", lastError.message || lastError);
  }

  return fallback;
}

function normalizeImages(value) {
  const parsed = Array.isArray(value) ? value : safeJsonParse(value, []);
  if (!Array.isArray(parsed)) return [];

  return parsed
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

function normalizeObject(value, fallback = {}) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return safeJsonParse(value, fallback) || fallback;
}

function normalizeItemRow(item) {
  if (!item || typeof item !== "object") return item;

  const images = normalizeImages(item.images_json);
  const specs = normalizeObject(item.specs_json, {});
  const schemaJsonld = normalizeObject(item.schema_jsonld, null);
  const breadcrumbJsonld = normalizeObject(item.breadcrumb_jsonld, null);
  const faqJsonld = normalizeObject(item.faq_jsonld, null);

  const itemName = item.item_name || item.name || item.title || "";
  const brandName = item.brand_name || "";
  const itemType = item.item_type || item.category || "";
  const category = item.category || item.item_type || "";
  const subcategory = item.subcategory || "";
  const slug = item.slug || slugify(itemName);
  const brandSlug = item.brand_slug || slugify(brandName);

  return {
    ...item,
    item_id: item.item_id || item.id || slug,
    status: item.status || "active",
    brand_name: brandName,
    brand_slug: brandSlug,
    item_type: itemType,
    category,
    subcategory,
    item_name: itemName,
    slug,
    short_summary: item.short_summary || "",
    price: item.price ?? "",
    currency: item.currency || CONFIG.site.currencyFallback,
    price_band: item.price_band || "",
    affiliate_platform: item.affiliate_platform || "",
    affiliate_url: item.affiliate_url || "",
    primary_image_url: item.primary_image_url || images[0]?.url || "",
    primary_image_alt: item.primary_image_alt || images[0]?.alt || itemName || "",
    images_json: images,
    key_features: item.key_features || "",
    specs_json: specs,
    use_cases: item.use_cases || "",
    html: item.html || "",
    meta_title: item.meta_title || "",
    meta_description: item.meta_description || "",
    h1: item.h1 || itemName,
    canonical_url: item.canonical_url || "",
    robots_meta: item.robots_meta || "index,follow",
    og_title: item.og_title || "",
    og_description: item.og_description || "",
    og_image: item.og_image || item.primary_image_url || images[0]?.url || "",
    twitter_card_type: item.twitter_card_type || CONFIG.seo.twitterCard,
    twitter_title: item.twitter_title || "",
    twitter_description: item.twitter_description || "",
    twitter_card_image: item.twitter_card_image || item.primary_image_url || images[0]?.url || "",
    primary_keyword: item.primary_keyword || "",
    secondary_keywords: item.secondary_keywords || "",
    search_intent: item.search_intent || "",
    schema_jsonld: schemaJsonld,
    breadcrumb_jsonld: breadcrumbJsonld,
    faq_jsonld: faqJsonld,
    featured_score: Number(item.featured_score || 0) || 0,
    updated_at: item.updated_at || "",
    search_text: String(
      [
        itemName,
        brandName,
        itemType,
        category,
        subcategory,
        item.short_summary,
        item.key_features,
        item.use_cases,
        item.meta_title,
        item.meta_description,
        item.primary_keyword,
        item.secondary_keywords,
        item.search_intent,
        JSON.stringify(specs),
        item.html,
      ]
        .filter(Boolean)
        .join(" ")
    ).replace(/\s+/g, " ").trim(),
  };
}

function normalizeBrandRow(brand) {
  if (!brand || typeof brand !== "object") return brand;

  const brandName = brand.brand_name || brand.title || brand.name || "";
  const brandSlug = brand.brand_slug || slugify(brandName);

  return {
    ...brand,
    brand_name: brandName,
    brand_slug: brandSlug,
    brand_logo_url: brand.brand_logo_url || brand.logo_url || "",
    brand_page_title: brand.brand_page_title || brand.title || brandName,
    brand_page_description: brand.brand_page_description || brand.description || "",
    items: arrayify(brand.items || []),
  };
}

function normalizeLabelRow(label) {
  if (!label || typeof label !== "object") return label;

  const key = label.key || label.slug || label.label || "";
  return {
    ...label,
    key,
    title: label.title || key,
    order: Number(label.order || 0) || 0,
    page_title: label.page_title || "",
    page_description: label.page_description || "",
  };
}

function normalizeBannerRow(banner) {
  if (!banner || typeof banner !== "object") return banner;
  return {
    ...banner,
    title: banner.title || "",
    subtitle: banner.subtitle || "",
    image: banner.image || banner.image_url || "",
    ctaText: banner.ctaText || banner.cta_text || "",
    ctaLink: banner.ctaLink || banner.cta_link || "",
  };
}

function normalizeListFromObject(obj, keyField = "title") {
  if (Array.isArray(obj)) return obj.filter(Boolean);
  if (!obj || typeof obj !== "object") return [];

  return Object.entries(obj).map(([key, value]) => {
    const entry = typeof value === "object" && value !== null ? value : {};
    return {
      key,
      title: entry.title || entry[keyField] || key,
      ...entry,
    };
  });
}

function normalizeData(data = {}) {
  const items = normalizeListFromObject(data.items || data.itemsJson || []).map(normalizeItemRow).filter(Boolean);
  const brands = normalizeListFromObject(data.brands || data.brandList || []).map(normalizeBrandRow).filter(Boolean);
  const labels = normalizeListFromObject(data.labels || data.labelList || []).map(normalizeLabelRow).filter(Boolean);
  const banners = normalizeListFromObject(data.banners || data.bannerList || []).map(normalizeBannerRow).filter(Boolean);

  const categories = Array.isArray(data.categories) ? uniqueStrings(data.categories) : [];
  const itemTypes = Array.isArray(data.itemTypes) ? uniqueStrings(data.itemTypes) : [];
  const subcategories = Array.isArray(data.subcategories) ? uniqueStrings(data.subcategories) : [];
  const searchIndex = Array.isArray(data.searchIndex) ? data.searchIndex : [];

  const itemMap = data.itemMap && typeof data.itemMap === "object" ? data.itemMap : {};
  const brandMap = data.brandMap && typeof data.brandMap === "object" ? data.brandMap : {};

  return {
    items,
    brands: brands.sort((a, b) => String(a.brand_name || "").localeCompare(String(b.brand_name || ""))),
    labels: labels.sort((a, b) => (Number(a.order || 0) - Number(b.order || 0)) || String(a.title || "").localeCompare(String(b.title || ""))),
    banners,
    categories,
    itemTypes,
    subcategories,
    searchIndex: searchIndex.length
      ? searchIndex
      : items.map((item) => ({
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
        })),
    itemMap: Object.keys(itemMap).length ? itemMap : buildMapByKey(items, "slug"),
    brandMap: Object.keys(brandMap).length ? brandMap : buildMapByKey(brands, "brand_slug"),
    summary: data.summary && typeof data.summary === "object" ? data.summary : {},
  };
}

function buildMapByKey(items, keyField) {
  const map = {};
  for (const item of items) {
    const key = String(item?.[keyField] || "").trim();
    if (!key) continue;
    map[key] = item;
  }
  return map;
}

async function loadCoreData(options = {}) {
  const refresh = Boolean(options.refresh);
  if (!refresh && DATA_CACHE.all) return DATA_CACHE.all;

  const [
    items,
    brands,
    labels,
    banners,
    categories,
    itemTypes,
    subcategories,
    searchIndex,
    itemMap,
    brandMap,
    summary,
  ] = await Promise.all([
    fetchJson(getDataUrl("items"), []),
    fetchJson(getDataUrl("brands"), []),
    fetchJson(getDataUrl("labels"), []),
    fetchJson(getDataUrl("banners"), []),
    fetchJson(getDataUrl("categories"), []),
    fetchJson(getDataUrl("itemTypes"), []),
    fetchJson(getDataUrl("subcategories"), []),
    fetchJson(getDataUrl("searchIndex"), []),
    fetchJson(getDataUrl("itemMap"), {}),
    fetchJson(getDataUrl("brandMap"), {}),
    fetchJson(getDataUrl("summary"), {}),
  ]);

  const normalized = normalizeData({
    items,
    brands,
    labels,
    banners,
    categories,
    itemTypes,
    subcategories,
    searchIndex,
    itemMap,
    brandMap,
    summary,
  });

  DATA_CACHE.all = normalized;
  return normalized;
}

export async function getAllData(options = {}) {
  return loadCoreData(options);
}

export async function getItems(options = {}) {
  const data = await loadCoreData(options);
  return data.items;
}

export async function getBrands(options = {}) {
  const data = await loadCoreData(options);
  return data.brands;
}

export async function getLabels(options = {}) {
  const data = await loadCoreData(options);
  return data.labels;
}

export async function getBanners(options = {}) {
  const data = await loadCoreData(options);
  return data.banners;
}

export async function getCategories(options = {}) {
  const data = await loadCoreData(options);
  return data.categories;
}

export async function getItemTypes(options = {}) {
  const data = await loadCoreData(options);
  return data.itemTypes;
}

export async function getSubcategories(options = {}) {
  const data = await loadCoreData(options);
  return data.subcategories;
}

export async function getSearchIndex(options = {}) {
  const data = await loadCoreData(options);
  return data.searchIndex;
}

export async function getSummary(options = {}) {
  const data = await loadCoreData(options);
  return data.summary;
}

export async function getItemBySlug(slug, options = {}) {
  const key = slugify(slug);
  if (!key) return null;

  const cacheKey = `item:${key}`;
  if (!options.refresh && DATA_CACHE.byKey.has(cacheKey)) {
    return DATA_CACHE.byKey.get(cacheKey);
  }

  const data = await loadCoreData(options);
  const item =
    data.itemMap?.[key] ||
    data.items.find((entry) => slugify(entry.slug) === key) ||
    null;

  DATA_CACHE.byKey.set(cacheKey, item);
  return item;
}

export async function getBrandBySlug(slug, options = {}) {
  const key = slugify(slug);
  if (!key) return null;

  const cacheKey = `brand:${key}`;
  if (!options.refresh && DATA_CACHE.byKey.has(cacheKey)) {
    return DATA_CACHE.byKey.get(cacheKey);
  }

  const data = await loadCoreData(options);
  const brand =
    data.brandMap?.[key] ||
    data.brands.find((entry) => slugify(entry.brand_slug) === key) ||
    null;

  DATA_CACHE.byKey.set(cacheKey, brand);
  return brand;
}

export async function getItemsByBrand(brandSlug, options = {}) {
  const key = slugify(brandSlug);
  if (!key) return [];

  const data = await loadCoreData(options);
  return data.items.filter(
    (item) => slugify(item.brand_slug) === key || slugify(item.brand_name) === key
  );
}

export async function getItemsByLabel(labelKey, options = {}) {
  const key = slugify(labelKey);
  if (!key) return [];

  const data = await loadCoreData(options);
  return data.items.filter((item) => {
    const values = [
      item.item_type,
      item.category,
      item.subcategory,
      item.brand_name,
      item.brand_slug,
      item.price_band,
      item.affiliate_platform,
    ].map((value) => slugify(value));

    return values.includes(key);
  });
}

export async function getItemsByType(typeValue, options = {}) {
  const key = slugify(typeValue);
  if (!key) return [];

  const data = await loadCoreData(options);
  return data.items.filter((item) =>
    [item.item_type, item.category, item.subcategory].map((v) => slugify(v)).includes(key)
  );
}

export async function getItemsByCategory(categoryValue, options = {}) {
  const key = slugify(categoryValue);
  if (!key) return [];

  const data = await loadCoreData(options);
  return data.items.filter(
    (item) => slugify(item.category) === key || slugify(item.item_type) === key
  );
}

export async function getItemsBySubcategory(subcategoryValue, options = {}) {
  const key = slugify(subcategoryValue);
  if (!key) return [];

  const data = await loadCoreData(options);
  return data.items.filter((item) => slugify(item.subcategory) === key);
}

export async function searchAll(query, options = {}) {
  const q = normalizeText(query);
  if (!q) return [];

  const data = await loadCoreData(options);
  const scored = [];

  for (const item of data.items) {
    const haystack = item.search_text || [
      item.item_name,
      item.brand_name,
      item.item_type,
      item.category,
      item.subcategory,
      item.short_summary,
      item.key_features,
      item.use_cases,
      item.meta_title,
      item.meta_description,
      item.primary_keyword,
      item.secondary_keywords,
      item.search_intent,
      item.html,
    ].filter(Boolean).join(" ");

    const score = scoreMatch(q, haystack);
    if (score > 0) {
      scored.push({
        type: "item",
        score,
        data: item,
      });
    }
  }

  for (const brand of data.brands) {
    const haystack = [
      brand.brand_name,
      brand.brand_page_title,
      brand.brand_page_description,
    ].filter(Boolean).join(" ");
    const score = scoreMatch(q, haystack);
    if (score > 0) {
      scored.push({
        type: "brand",
        score,
        data: brand,
      });
    }
  }

  for (const label of data.labels) {
    const haystack = [
      label.key,
      label.title,
      label.page_title,
      label.page_description,
    ].filter(Boolean).join(" ");
    const score = scoreMatch(q, haystack);
    if (score > 0) {
      scored.push({
        type: "label",
        score,
        data: label,
      });
    }
  }

  const deduped = scored
    .sort((a, b) => b.score - a.score)
    .reduce((acc, entry) => {
      const key =
        entry.type === "item"
          ? `item:${entry.data.slug}`
          : entry.type === "brand"
            ? `brand:${entry.data.brand_slug}`
            : `label:${entry.data.key}`;

      if (!acc.has(key)) acc.set(key, entry);
      return acc;
    }, new Map());

  return Array.from(deduped.values());
}

export async function refreshData() {
  DATA_CACHE.all = null;
  DATA_CACHE.byKey.clear();
  return loadCoreData({ refresh: true });
}

export async function loadTextFile(pathValue, fallback = "") {
  try {
    const response = await fetch(pathValue, { cache: "no-store" });
    if (!response.ok) return fallback;
    return await response.text();
  } catch {
    return fallback;
  }
}

export function getCachedData() {
  return DATA_CACHE.all;
}