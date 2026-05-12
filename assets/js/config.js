export const CONFIG = {
  site: {
    name: "Smart Home Automation",
    shortName: "Smart Home",
    tagline: "Smart home automation and security product discovery",
    description:
      "Browse smart home automation and security products with advanced filters, brand discovery, smart search, SEO-friendly item pages, and affiliate purchase links.",
    designBy: "Sukhdev Dahiya",
    currencyFallback: "INR",
    defaultTheme: "dark",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
  },

  source: {
    mode: "google_sheet_json",
    sheetId: "19H6vcik2wuqTlbV9UwRR0pnW7B4WEoJl",
    sheetUrl:
      "https://docs.google.com/spreadsheets/d/19H6vcik2wuqTlbV9UwRR0pnW7B4WEoJl/edit?usp=drivesdk",
    mainTab: "Items",
    brandsTab: "brands",
    labelsTab: "labels",
    bannersTab: "banners",
  },

  data: {
    // These files are served from the site root after build.
    items: "items.json",
    itemMap: "item-map.json",
    brands: "brands.json",
    brandMap: "brand-map.json",
    labels: "labels.json",
    categories: "categories.json",
    itemTypes: "item-types.json",
    subcategories: "subcategories.json",
    banners: "banners.json",
    searchIndex: "search-index.json",
    summary: "site-summary.json",
    siteConfig: "site-config.json",
  },

  routes: {
    home: "./",
    category: "category.html",
    product: "product.html",
    compare: "compare.html",
    about: "about.html",
    contact: "contact.html",
    career: "career.html",
    privacy: "privacy.html",
    terms: "terms.html",
    disclaimer: "disclaimer.html",
  },

  ui: {
    initialPageSize: 12,
    loadMorePageSize: 12,
    compareMaxItems: 4,
    heroAutoplayDelay: 5000,
    heroManualPauseDelay: 10000,
    searchDebounceMs: 180,
    maxSearchSuggestions: 8,
    maxRelatedItems: 8,
    brandStripVisibleCount: 12,
    stickyHeader: true,
    premiumGlassUI: true,
  },

  browse: {
    homeSections: ["hero", "search", "brands", "labels", "categories", "featured", "guides"],
    pageSectionOrder: ["search", "brands", "labels", "filters", "results", "guides"],
    defaultSort: "featured",
  },

  filters: {
    priceBands: [
      { key: "budget", title: "Budget" },
      { key: "mid", title: "Mid" },
      { key: "premium", title: "Premium" },
      { key: "elite", title: "Elite" },
    ],
    sortOptions: [
      { value: "featured", label: "Featured" },
      { value: "score_desc", label: "Best score" },
      { value: "price_asc", label: "Price low to high" },
      { value: "price_desc", label: "Price high to low" },
      { value: "name_asc", label: "Name A to Z" },
    ],
    compatibility: [
      { key: "matter", title: "Matter" },
      { key: "thread", title: "Thread" },
      { key: "zigbee", title: "Zigbee" },
      { key: "wifi", title: "Wi-Fi" },
      { key: "bluetooth", title: "Bluetooth" },
      { key: "z_wave", title: "Z-Wave" },
    ],
  },

  taxonomy: {
    labelSourceFields: ["item_type", "category", "subcategory"],
    brandSourceField: "brand_name",
    searchFields: [
      "item_name",
      "brand_name",
      "item_type",
      "category",
      "subcategory",
      "short_summary",
      "key_features",
      "use_cases",
      "html",
      "meta_title",
      "meta_description",
      "primary_keyword",
      "secondary_keywords",
      "search_intent",
    ],
  },

  seo: {
    defaultTitle: "Smart Home Automation & Security Products",
    defaultDescription:
      "Browse smart home automation and security products with advanced filters, brand discovery, smart search, and SEO-friendly buying guides.",
    defaultOgImage: "assets/images/og-cover.jpg",
    twitterCard: "summary_large_image",
    robots: "index,follow",
  },

  schema: {
    enableProductSchema: true,
    enableBreadcrumbSchema: true,
    enableFaqSchema: true,
    enableOrganizationSchema: true,
    enableWebsiteSchema: true,
  },

  comparison: {
    maxItems: 4,
    storageKey: "sha_compare",
  },

  storage: {
    themeKey: "sha_theme",
    compareKey: "sha_compare",
  },

  placeholders: {
    favicon: "assets/images/favicon.png",
    logo: "assets/images/logo.png",
  },
};

export function getDataUrl(key) {
  return CONFIG.data[key] || "";
}

export function getRouteUrl(key) {
  return CONFIG.routes[key] || "";
}

export function getStorageKey(key) {
  return CONFIG.storage[key] || "";
}

export function mergeRuntimeConfig(runtimeConfig = {}) {
  return {
    ...CONFIG,
    ...runtimeConfig,
    site: {
      ...CONFIG.site,
      ...(runtimeConfig.site || {}),
    },
    source: {
      ...CONFIG.source,
      ...(runtimeConfig.source || {}),
    },
    data: {
      ...CONFIG.data,
      ...(runtimeConfig.data || {}),
    },
    routes: {
      ...CONFIG.routes,
      ...(runtimeConfig.routes || {}),
    },
    ui: {
      ...CONFIG.ui,
      ...(runtimeConfig.ui || {}),
    },
    browse: {
      ...CONFIG.browse,
      ...(runtimeConfig.browse || {}),
    },
    filters: {
      ...CONFIG.filters,
      ...(runtimeConfig.filters || {}),
    },
    taxonomy: {
      ...CONFIG.taxonomy,
      ...(runtimeConfig.taxonomy || {}),
    },
    seo: {
      ...CONFIG.seo,
      ...(runtimeConfig.seo || {}),
    },
    schema: {
      ...CONFIG.schema,
      ...(runtimeConfig.schema || {}),
    },
    comparison: {
      ...CONFIG.comparison,
      ...(runtimeConfig.comparison || {}),
    },
    storage: {
      ...CONFIG.storage,
      ...(runtimeConfig.storage || {}),
    },
    placeholders: {
      ...CONFIG.placeholders,
      ...(runtimeConfig.placeholders || {}),
    },
  };
}