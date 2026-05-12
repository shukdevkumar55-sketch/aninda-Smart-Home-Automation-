import { CONFIG } from "./config.js";
import {
  debounce,
  normalizeText,
  parseQuery,
  scoreMatch,
  slugify,
  sortItems,
  toNumber,
  updateQuery,
  uniqueStrings,
} from "./utils.js";
import {
  buildDefaultGuides,
  buildGuideFromHtml,
  injectJsonLd,
  renderBrandStrip,
  renderBreadcrumbs,
  renderChips,
  renderCompareDrawer,
  renderCountsNote,
  renderEmptyState,
  renderFilterOptions,
  renderGuideCards,
  renderHeroSlider,
  renderLabelAndCategoryChips,
  renderLoadingState,
  renderPageSchema,
  renderProductsGrid,
  renderProductDetail,
  renderSearchSuggestions,
  renderSelectOptions,
  setDocumentMeta,
  setHeroSlide,
} from "./render.js";
import {
  getAllData,
  getItemBySlug,
  searchAll,
} from "./api.js";

const BROAD_TYPE_GROUPS = {
  security: [
    "smart-lock",
    "security-camera",
    "video-doorbell",
    "alarm-system",
    "motion-sensor",
    "contact-sensor",
    "smoke-sensor",
    "water-leak-sensor",
    "access-control",
    "indoor-security",
    "outdoor-security",
    "security-equipment",
    "alarm",
    "camera",
    "doorbell",
    "lock",
    "sensor",
  ],
  automation: [
    "smart-switch",
    "smart-dimmer",
    "smart-plug",
    "automation-device",
    "smart-controller",
    "smart-hub",
    "relay",
    "bridge",
  ],
  energy: [
    "energy-monitor",
    "smart-plug",
    "smart-thermostat",
    "automation-device",
  ],
  climate: [
    "smart-thermostat",
    "climate",
  ],
  access: [
    "smart-lock",
    "access-control",
    "entry-device",
  ],
};

const state = {
  route: "home",
  data: null,
  compareSet: new Set(),
  activeBrand: "",
  activeCategory: "",
  activeLabel: "",
  activePriceBand: "",
  activeType: "",
  activeCompatibility: new Set(),
  activeSort: CONFIG.browse.defaultSort,
  searchQuery: "",
  searchMatchMap: new Map(),
  filteredItems: [],
  visibleItems: [],
  pageSize: CONFIG.ui.initialPageSize,
  heroIndex: 0,
  heroTimer: null,
  heroPausedUntil: 0,
  heroResumeTimer: null,
  searchRequestToken: 0,
};

const dom = {};

function cacheDom() {
  dom.siteHeader = document.getElementById("siteHeader");
  dom.menuButton = document.getElementById("menuButton");
  dom.mobileMenu = document.getElementById("mobileMenu");
  dom.searchFocusButton = document.getElementById("searchFocusButton");
  dom.themeButton = document.getElementById("themeButton");
  dom.compareCount = document.getElementById("compareCount");
  dom.compareDrawer = document.getElementById("compareDrawer");
  dom.compareDrawerBackdrop = document.getElementById("compareDrawerBackdrop");
  dom.closeCompareDrawer = document.getElementById("closeCompareDrawer");
  dom.compareDrawerItems = document.getElementById("compareDrawerItems");

  dom.heroTrack = document.getElementById("heroTrack");
  dom.heroPrev = document.getElementById("heroPrev");
  dom.heroNext = document.getElementById("heroNext");

  dom.searchForm = document.getElementById("searchForm");
  dom.searchInput = document.getElementById("searchInput");
  dom.searchSuggestions = document.getElementById("searchSuggestions");

  dom.brandStrip = document.getElementById("brandStrip");
  dom.labelChips = document.getElementById("labelChips");
  dom.categoryChips = document.getElementById("categoryChips");

  dom.priceFilter = document.getElementById("priceFilter");
  dom.brandFilter = document.getElementById("brandFilter");
  dom.typeFilter = document.getElementById("typeFilter");
  dom.categoryFilter = document.getElementById("categoryFilter");
  dom.compatibilityFilter = document.getElementById("compatibilityFilter");
  dom.sortSelect = document.getElementById("sortSelect");
  dom.resetFiltersButton = document.getElementById("resetFiltersButton");

  dom.resultsTitle = document.getElementById("resultsTitle");
  dom.resultsCount = document.getElementById("resultsCount");
  dom.resultsNote = document.getElementById("resultsNote");
  dom.productsGrid = document.getElementById("productsGrid");
  dom.loadMoreButton = document.getElementById("loadMoreButton");

  dom.guideGrid = document.getElementById("guideGrid");

  dom.breadcrumbMount = document.getElementById("breadcrumbMount");
  dom.productDetailMount = document.getElementById("productDetailMount");
}

function humanizeSlug(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function getCompareList() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG.storage.compareKey) || "[]");
  } catch {
    return [];
  }
}

function setCompareList(list) {
  localStorage.setItem(CONFIG.storage.compareKey, JSON.stringify(list));
}

function applyCompareStateFromStorage() {
  state.compareSet = new Set(getCompareList());
  if (dom.compareCount) dom.compareCount.textContent = String(state.compareSet.size);
  renderCompareDrawerPanel();
}

function syncVisibleCompareState() {
  applyCompareStateFromStorage();
  if (state.route === "compare") {
    renderComparePage();
  } else if ((state.route === "home" || state.route === "category") && dom.productsGrid) {
    renderListing();
  }
}

function addToCompare(slug) {
  const list = getCompareList();
  if (list.includes(slug)) return;

  if (list.length >= CONFIG.ui.compareMaxItems) return;
  list.push(slug);
  setCompareList(list);
  syncVisibleCompareState();
}

function removeFromCompare(slug) {
  const list = getCompareList().filter((entry) => entry !== slug);
  setCompareList(list);
  syncVisibleCompareState();
}

function clearCompare() {
  setCompareList([]);
  syncVisibleCompareState();
}

function openCompareDrawer() {
  if (dom.compareDrawer) dom.compareDrawer.hidden = false;
  if (dom.compareDrawerBackdrop) dom.compareDrawerBackdrop.hidden = false;
}

function closeCompareDrawer() {
  if (dom.compareDrawer) dom.compareDrawer.hidden = true;
  if (dom.compareDrawerBackdrop) dom.compareDrawerBackdrop.hidden = true;
}

function renderCompareDrawerPanel() {
  if (!dom.compareDrawerItems || !state.data) return;

  const items = state.data.items.filter((item) => state.compareSet.has(item.slug));
  renderCompareDrawer(dom.compareDrawerItems, items, {
    onRemove: (item) => removeFromCompare(item.slug),
    onClear: () => clearCompare(),
  });
}

function currentRoute() {
  const file = window.location.pathname.split("/").pop() || "index.html";
  if (file === "" || file === "index.html") return "home";
  if (file === "category.html") return "category";
  if (file === "product.html") return "product";
  if (file === "compare.html") return "compare";
  return "home";
}

function applyThemePreference() {
  const stored = localStorage.getItem(CONFIG.storage.themeKey) || CONFIG.site.defaultTheme;
  document.documentElement.dataset.theme = stored;
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme || CONFIG.site.defaultTheme;
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(CONFIG.storage.themeKey, next);
}

function getVisibleCatalogItems() {
  const items = state.data?.items || [];
  return items.filter((item) => String(item.status || "active").toLowerCase() !== "archived");
}

function getListingSourceItems() {
  return getVisibleCatalogItems();
}

function matchesBrand(item, value) {
  const key = slugify(value);
  return slugify(item.brand_slug) === key || slugify(item.brand_name) === key;
}

function matchesCategory(item, value) {
  const key = slugify(value);
  return [item.category, item.item_type].map((entry) => slugify(entry)).includes(key);
}

function matchesLabel(item, value) {
  const key = slugify(value);
  return [item.item_type, item.category, item.subcategory].map((entry) => slugify(entry)).includes(key);
}

function matchesType(item, value) {
  const key = slugify(value);
  const itemKeys = [item.item_type, item.category, item.subcategory].map((entry) => slugify(entry));
  if (itemKeys.includes(key)) return true;

  const group = BROAD_TYPE_GROUPS[key];
  if (!group) return false;

  return group.some((term) => itemKeys.includes(term) || normalizeText(item.search_text || "").includes(normalizeText(term)));
}

function matchesPriceBand(item, value) {
  return slugify(item.price_band) === slugify(value);
}

function matchesCompatibility(item, compatibilitySet) {
  if (!compatibilitySet.size) return true;

  const haystack = normalizeText(
    [
      item.key_features,
      item.use_cases,
      item.html,
      JSON.stringify(item.specs_json || {}),
      item.meta_title,
      item.meta_description,
    ]
      .filter(Boolean)
      .join(" ")
  );

  return Array.from(compatibilitySet).every((term) => haystack.includes(normalizeText(term)));
}

function buildSearchMatchMap(query) {
  const q = normalizeText(query);
  const qSlug = slugify(query);
  const map = new Map();
  if (!q || !state.data) return map;

  const items = getVisibleCatalogItems();
  const brands = state.data.brands || [];
  const labels = state.data.labels || [];

  for (const item of items) {
    const score = scoreMatch(q, item.search_text || "");
    if (score > 0) map.set(item.slug, Math.max(map.get(item.slug) || 0, score));
  }

  for (const brand of brands) {
    const brandSlug = slugify(brand.brand_slug || brand.brand_name);
    const brandScore = scoreMatch(
      q,
      [
        brand.brand_name,
        brand.brand_page_title,
        brand.brand_page_description,
      ]
        .filter(Boolean)
        .join(" ")
    );

    if (brandScore > 0 || brandSlug === qSlug) {
      items
        .filter((item) => matchesBrand(item, brandSlug))
        .forEach((item) => map.set(item.slug, Math.max(map.get(item.slug) || 0, brandScore || 95)));
    }
  }

  for (const label of labels) {
    const labelKey = slugify(label.key || label.title);
    const labelScore = scoreMatch(
      q,
      [
        label.key,
        label.title,
        label.page_title,
        label.page_description,
      ]
        .filter(Boolean)
        .join(" ")
    );

    if (labelScore > 0 || labelKey === qSlug) {
      items
        .filter((item) => matchesLabel(item, labelKey))
        .forEach((item) => map.set(item.slug, Math.max(map.get(item.slug) || 0, labelScore || 92)));
    }
  }

  return map;
}

function compareBySortMode(a, b, mode) {
  const price = (item) => toNumber(item.price, Number.POSITIVE_INFINITY);
  const score = (item) => toNumber(item.featured_score, 0);
  const name = (item) => normalizeText(item.item_name || item.name || "");

  switch (mode) {
    case "score_desc":
      return score(b) - score(a) || name(a).localeCompare(name(b));
    case "price_asc":
      return price(a) - price(b) || score(b) - score(a);
    case "price_desc":
      return price(b) - price(a) || score(b) - score(a);
    case "name_asc":
      return name(a).localeCompare(name(b));
    case "featured":
    default:
      return score(b) - score(a) || name(a).localeCompare(name(b));
  }
}

function sortFilteredItems(items) {
  const list = [...items];

  if (state.searchQuery) {
    return list.sort((a, b) => {
      const searchScoreA = state.searchMatchMap.get(a.slug) || 0;
      const searchScoreB = state.searchMatchMap.get(b.slug) || 0;
      return (
        searchScoreB - searchScoreA ||
        compareBySortMode(a, b, state.activeSort)
      );
    });
  }

  return sortItems(list, state.activeSort);
}

function persistListingStateToUrl() {
  updateQuery(
    {
      q: state.searchQuery || null,
      brand: state.activeBrand || null,
      category: state.activeCategory || null,
      label: state.activeLabel || null,
      price: state.activePriceBand || null,
      type: state.activeType || null,
      sort: state.activeSort !== CONFIG.browse.defaultSort ? state.activeSort : null,
    },
    { replace: true }
  );
}

function setListingStateFromUrl() {
  const q = parseQuery();
  state.searchQuery = q.q || "";
  state.activeBrand = q.brand || "";
  state.activeCategory = q.category || q.cat || "";
  state.activeLabel = q.label || "";
  state.activePriceBand = q.price || q.priceBand || "";
  state.activeType = q.type || "";
  state.activeSort = q.sort || CONFIG.browse.defaultSort;

  state.activeCompatibility = new Set(
    uniqueStrings(String(q.compatibility || "").split(",").map((v) => v.trim()).filter(Boolean))
  );

  if (dom.searchInput) dom.searchInput.value = state.searchQuery;
  if (dom.sortSelect) dom.sortSelect.value = state.activeSort;
}

function updateListingMeta(title, description) {
  setDocumentMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogImage: CONFIG.seo.defaultOgImage,
    canonicalUrl: window.location.href.split("#")[0],
    robots: CONFIG.seo.robots,
    type: "website",
  });
}

function getListingContext() {
  const brands = state.data?.brands || [];
  const labels = state.data?.labels || [];

  if (state.searchQuery) {
    return {
      title: `Search results for "${state.searchQuery}" | ${CONFIG.site.name}`,
      description: `Search results for "${state.searchQuery}" across smart home automation and security products.`,
      note: `Showing results for "${state.searchQuery}".`,
    };
  }

  if (state.activeBrand) {
    const brand = brands.find((entry) => matchesBrand(entry, state.activeBrand));
    const name = brand?.brand_name || humanizeSlug(state.activeBrand);
    return {
      title: `${name} products | ${CONFIG.site.name}`,
      description: brand?.brand_page_description || `Browse ${name} smart home products and related items.`,
      note: `Showing items from ${name}.`,
    };
  }

  if (state.activeLabel) {
    const label = labels.find((entry) => slugify(entry.key || entry.title) === slugify(state.activeLabel));
    const name = label?.title || humanizeSlug(state.activeLabel);
    return {
      title: `${name} | ${CONFIG.site.name}`,
      description: label?.page_description || `Browse ${name} smart home products and related items.`,
      note: `Showing items for ${name}.`,
    };
  }

  if (state.activeCategory) {
    const name = humanizeSlug(state.activeCategory);
    return {
      title: `${name} products | ${CONFIG.site.name}`,
      description: `Browse ${name} smart home products and related items.`,
      note: `Showing items for ${name}.`,
    };
  }

  if (state.activeType) {
    const name = humanizeSlug(state.activeType);
    return {
      title: `${name} products | ${CONFIG.site.name}`,
      description: `Browse ${name} smart home products and related items.`,
      note: `Showing items for ${name}.`,
    };
  }

  return {
    title: CONFIG.seo.defaultTitle,
    description: CONFIG.seo.defaultDescription,
    note: "Featured items from the full catalog.",
  };
}

function refreshListing() {
  if (!(state.route === "home" || state.route === "category")) return;
  if (!state.data) return;

  const sourceItems = getListingSourceItems();

  let filtered = sourceItems.filter((item) => {
    if (state.activeBrand && !matchesBrand(item, state.activeBrand)) return false;
    if (state.activeCategory && !matchesCategory(item, state.activeCategory)) return false;
    if (state.activeLabel && !matchesLabel(item, state.activeLabel)) return false;
    if (state.activePriceBand && !matchesPriceBand(item, state.activePriceBand)) return false;
    if (state.activeType && !matchesType(item, state.activeType)) return false;
    if (!matchesCompatibility(item, state.activeCompatibility)) return false;
    return true;
  });

  if (state.searchQuery) {
    state.searchMatchMap = buildSearchMatchMap(state.searchQuery);
    filtered = filtered.filter((item) => state.searchMatchMap.has(item.slug));
  } else {
    state.searchMatchMap = new Map();
  }

  filtered = sortFilteredItems(filtered);

  state.filteredItems = filtered;
  state.visibleItems = filtered.slice(0, state.pageSize);

  const context = getListingContext();
  updateListingMeta(context.title, context.description);

  if (dom.resultsTitle) dom.resultsTitle.textContent = context.title.replace(` | ${CONFIG.site.name}`, "");
  if (dom.resultsCount) dom.resultsCount.textContent = `${filtered.length} items`;
  renderCountsNote(dom.resultsNote, context.note);

  renderVisibleItems();
  updateLoadMoreButton();
}

function renderVisibleItems() {
  if (!dom.productsGrid) return;

  if (!state.visibleItems.length) {
    renderEmptyState(
      dom.productsGrid,
      "No results found",
      "Try changing filters, clearing search, or browsing a different brand or label."
    );
    return;
  }

  renderProductsGrid(dom.productsGrid, state.visibleItems, {
    compareSet: state.compareSet,
    onCompareToggle: (item, nextState) => {
      if (nextState) addToCompare(item.slug);
      else removeFromCompare(item.slug);
    },
    onCardClick: (item, event) => {
      const anchor = event.target.closest("a");
      if (anchor) return true;
      window.location.href = `product.html?slug=${encodeURIComponent(item.slug)}`;
      return false;
    },
  });
}

function updateLoadMoreButton() {
  if (!dom.loadMoreButton) return;

  const remaining = Math.max(0, state.filteredItems.length - state.visibleItems.length);
  const shouldShow = state.filteredItems.length > state.pageSize;
  dom.loadMoreButton.hidden = !shouldShow;
  dom.loadMoreButton.disabled = remaining <= 0;
  dom.loadMoreButton.textContent = remaining > 0 ? `Load more (${remaining} left)` : "No more items";
}

function loadMoreItems() {
  const nextCount = Math.min(state.filteredItems.length, state.visibleItems.length + state.pageSize);
  state.visibleItems = state.filteredItems.slice(0, nextCount);
  renderVisibleItems();
  updateLoadMoreButton();
}

function renderSidebarFilters() {
  if (!state.data) return;

  const brands = state.data.brands || [];
  const labels = state.data.labels || [];
  const categories = state.data.categories || [];
  const itemTypes = state.data.itemTypes || [];
  const priceBands = CONFIG.filters.priceBands;
  const compatibility = CONFIG.filters.compatibility;

  if (dom.brandFilter) {
    renderFilterOptions(
      dom.brandFilter,
      brands.map((brand) => ({
        key: brand.brand_slug || slugify(brand.brand_name),
        title: brand.brand_name,
      })),
      new Set(state.activeBrand ? [slugify(state.activeBrand)] : []),
      {
        inputName: "brand",
        onToggle: (key, checked, option) => {
          state.activeBrand = checked ? key : "";
          persistListingStateToUrl();
          refreshListing();
          renderSidebarFilters();
        },
      }
    );
  }

  if (dom.categoryFilter) {
    renderFilterOptions(
      dom.categoryFilter,
      categories.map((category) => ({ key: category, title: category })),
      new Set(state.activeCategory ? [slugify(state.activeCategory)] : []),
      {
        inputName: "category",
        onToggle: (key, checked) => {
          state.activeCategory = checked ? key : "";
          persistListingStateToUrl();
          refreshListing();
          renderSidebarFilters();
        },
      }
    );
  }

  if (dom.typeFilter) {
    renderFilterOptions(
      dom.typeFilter,
      itemTypes.map((type) => ({ key: type, title: type })),
      new Set(state.activeType ? [slugify(state.activeType)] : []),
      {
        inputName: "type",
        onToggle: (key, checked) => {
          state.activeType = checked ? key : "";
          persistListingStateToUrl();
          refreshListing();
          renderSidebarFilters();
        },
      }
    );
  }

  if (dom.priceFilter) {
    renderFilterOptions(
      dom.priceFilter,
      priceBands,
      new Set(state.activePriceBand ? [slugify(state.activePriceBand)] : []),
      {
        inputName: "price",
        onToggle: (key, checked) => {
          state.activePriceBand = checked ? key : "";
          persistListingStateToUrl();
          refreshListing();
          renderSidebarFilters();
        },
      }
    );
  }

  if (dom.compatibilityFilter) {
    renderFilterOptions(
      dom.compatibilityFilter,
      compatibility,
      new Set(state.activeCompatibility),
      {
        inputName: "compatibility",
        onToggle: (key, checked) => {
          if (checked) state.activeCompatibility.add(key);
          else state.activeCompatibility.delete(key);
          persistListingStateToUrl();
          refreshListing();
          renderSidebarFilters();
        },
      }
    );
  }

  if (dom.sortSelect) {
    renderSelectOptions(dom.sortSelect, CONFIG.filters.sortOptions, state.activeSort);
  }

  if (dom.labelChips) {
    renderChips(dom.labelChips, labels, {
      keyField: "key",
      titleField: "title",
      activeKey: state.activeLabel,
      onChipClick: (label) => {
        state.activeLabel = label.key || label.title;
        persistListingStateToUrl();
        refreshListing();
        renderSidebarFilters();
        return false;
      },
    });
  }

  if (dom.categoryChips) {
    renderChips(dom.categoryChips, categories.map((category) => ({
      key: category,
      title: category,
    })), {
      keyField: "key",
      titleField: "title",
      activeKey: state.activeCategory,
      onChipClick: (category) => {
        state.activeCategory = category.key || category.title;
        persistListingStateToUrl();
        refreshListing();
        renderSidebarFilters();
        return false;
      },
    });
  }
}

function renderBrowseDecorations() {
  if (!state.data) return;

  if (dom.brandStrip) {
    renderBrandStrip(dom.brandStrip, state.data.brands || []);
  }

  renderSidebarFilters();

  if (dom.guideGrid) {
    renderGuideCards(dom.guideGrid, buildDefaultGuides(state.data.items || []));
  }
}

function setupSearch() {
  if (!dom.searchForm || !dom.searchInput) return;

  const debounced = debounce(async (value) => {
    const trimmed = value.trim();
    state.searchQuery = trimmed;
    persistListingStateToUrl();
    refreshListing();

    if (!trimmed) {
      hideSuggestions();
      return;
    }

    const token = ++state.searchRequestToken;
    const results = await searchAll(trimmed);
    if (token !== state.searchRequestToken) return;
    renderSearchSuggestions(dom.searchSuggestions, results, {
      onPick: (result) => {
        const type = result.type || result.data?.type || "item";
        const data = result.data || result;

        if (type === "brand") {
          state.activeBrand = data.brand_slug || data.brand_name || "";
          state.searchQuery = "";
          if (dom.searchInput) dom.searchInput.value = "";
          persistListingStateToUrl();
          refreshListing();
          renderSidebarFilters();
          hideSuggestions();
          return false;
        }

        if (type === "label") {
          state.activeLabel = data.key || data.title || "";
          state.searchQuery = "";
          if (dom.searchInput) dom.searchInput.value = "";
          persistListingStateToUrl();
          refreshListing();
          renderSidebarFilters();
          hideSuggestions();
          return false;
        }

        if (data.slug) {
          window.location.href = `product.html?slug=${encodeURIComponent(data.slug)}`;
          return false;
        }

        return true;
      },
    });
  }, CONFIG.ui.searchDebounceMs);

  dom.searchInput.addEventListener("input", (event) => {
    debounced(event.target.value);
  });

  dom.searchInput.addEventListener("focus", async () => {
    const value = dom.searchInput.value.trim();
    if (!value) return;

    const token = ++state.searchRequestToken;
    const results = await searchAll(value);
    if (token !== state.searchRequestToken) return;

    renderSearchSuggestions(dom.searchSuggestions, results, {
      onPick: () => true,
    });
  });

  dom.searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = dom.searchInput.value.trim();
    state.searchQuery = value;
    persistListingStateToUrl();
    refreshListing();

    if (!value) {
      hideSuggestions();
      return;
    }

    const token = ++state.searchRequestToken;
    const results = await searchAll(value);
    if (token !== state.searchRequestToken) return;

    renderSearchSuggestions(dom.searchSuggestions, results, {
      onPick: () => true,
    });
  });

  document.addEventListener("click", (event) => {
    if (!dom.searchSuggestions) return;
    if (event.target === dom.searchInput) return;
    if (dom.searchSuggestions.contains(event.target)) return;
    hideSuggestions();
  });
}
function setupHeaderControls() {
  if (dom.menuButton && dom.mobileMenu) {
    dom.menuButton.addEventListener("click", () => {
      const nextHidden = !dom.mobileMenu.hidden;
      dom.mobileMenu.hidden = nextHidden;
      dom.menuButton.setAttribute("aria-expanded", String(!nextHidden));
    });
  }

  if (dom.searchFocusButton && dom.searchInput) {
    dom.searchFocusButton.addEventListener("click", () => {
      dom.searchInput.focus();
    });
  }

  if (dom.themeButton) {
    dom.themeButton.addEventListener("click", toggleTheme);
  }

  const compareButton = dom.compareCount?.parentElement;
  if (compareButton) {
    compareButton.addEventListener("click", (event) => {
      event.preventDefault();
      openCompareDrawer();
    });
  }

  if (dom.closeCompareDrawer) dom.closeCompareDrawer.addEventListener("click", closeCompareDrawer);
  if (dom.compareDrawerBackdrop) dom.compareDrawerBackdrop.addEventListener("click", closeCompareDrawer);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeCompareDrawer();
      hideSuggestions();
      if (dom.mobileMenu) dom.mobileMenu.hidden = true;
    }
  });
}

function setupFilters() {
  if (dom.resetFiltersButton) {
    dom.resetFiltersButton.addEventListener("click", () => {
      state.activeBrand = "";
      state.activeCategory = "";
      state.activeLabel = "";
      state.activePriceBand = "";
      state.activeType = "";
      state.activeCompatibility = new Set();
      state.searchQuery = "";
      state.activeSort = CONFIG.browse.defaultSort;
      if (dom.searchInput) dom.searchInput.value = "";
      if (dom.sortSelect) dom.sortSelect.value = state.activeSort;

      persistListingStateToUrl();
      refreshListing();
      renderSidebarFilters();
      hideSuggestions();
    });
  }

  if (dom.sortSelect) {
    renderSelectOptions(dom.sortSelect, CONFIG.filters.sortOptions, state.activeSort);
    dom.sortSelect.addEventListener("change", (event) => {
      state.activeSort = event.target.value;
      persistListingStateToUrl();
      refreshListing();
    });
  }
}

function hideSuggestions() {
  if (!dom.searchSuggestions) return;
  dom.searchSuggestions.hidden = true;
  dom.searchSuggestions.innerHTML = "";
}

function startHeroAutoplay() {
  stopHeroAutoplay();
  if (!dom.heroTrack) return;

  state.heroTimer = window.setInterval(() => {
    if (Date.now() < state.heroPausedUntil) return;
    advanceHero(1);
  }, CONFIG.ui.heroAutoplayDelay);
}

function stopHeroAutoplay() {
  if (state.heroTimer) {
    clearInterval(state.heroTimer);
    state.heroTimer = null;
  }
  if (state.heroResumeTimer) {
    clearTimeout(state.heroResumeTimer);
    state.heroResumeTimer = null;
  }
}

function pauseHeroForManualAction() {
  state.heroPausedUntil = Date.now() + CONFIG.ui.heroManualPauseDelay;
  if (state.heroResumeTimer) clearTimeout(state.heroResumeTimer);

  state.heroResumeTimer = window.setTimeout(() => {
    state.heroPausedUntil = 0;
  }, CONFIG.ui.heroManualPauseDelay);
}

function advanceHero(delta) {
  if (!dom.heroTrack) return;
  const slides = Array.from(dom.heroTrack.querySelectorAll(".hero__slide"));
  if (!slides.length) return;

  state.heroIndex = ((state.heroIndex + delta) % slides.length + slides.length) % slides.length;
  setHeroSlide(dom.heroTrack, state.heroIndex);
}

function setupHero() {
  if (!dom.heroTrack) return;

  if (dom.heroPrev) {
    dom.heroPrev.addEventListener("click", () => {
      pauseHeroForManualAction();
      advanceHero(-1);
    });
  }

  if (dom.heroNext) {
    dom.heroNext.addEventListener("click", () => {
      pauseHeroForManualAction();
      advanceHero(1);
    });
  }

  dom.heroTrack.addEventListener("pointerdown", pauseHeroForManualAction, { passive: true });
  dom.heroTrack.addEventListener("touchstart", pauseHeroForManualAction, { passive: true });

  startHeroAutoplay();
}

function setupLoadMore() {
  if (!dom.loadMoreButton) return;
  dom.loadMoreButton.addEventListener("click", loadMoreItems);
}

function setupCompareDrawerActions() {
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-compare-open]");
    if (trigger) openCompareDrawer();
  });
}

function getBrowsePageTitle() {
  const context = getListingContext();
  return context.title.replace(` | ${CONFIG.site.name}`, "");
}

function renderHomePage() {
  if (!state.data) return;

  if (dom.heroTrack) {
    renderHeroSlider(dom.heroTrack, state.data.banners || []);
    setHeroSlide(dom.heroTrack, 0);
  }

  renderBrowseDecorations();
  refreshListing();

  const brands = state.data.brands || [];
  const labels = state.data.labels || [];
  const categories = state.data.categories || [];

  if (dom.labelChips) {
    renderLabelAndCategoryChips(dom.labelChips, dom.categoryChips, labels, categories, {
      activeLabel: state.activeLabel,
      activeCategory: state.activeCategory,
      onLabelClick: (label) => {
        state.activeLabel = label.key || label.title;
        persistListingStateToUrl();
        refreshListing();
        renderSidebarFilters();
        return false;
      },
      onCategoryClick: (category) => {
        state.activeCategory = category.key || category.title;
        persistListingStateToUrl();
        refreshListing();
        renderSidebarFilters();
        return false;
      },
    });
  }

  if (dom.brandStrip) {
    renderBrandStrip(dom.brandStrip, brands);
  }

  if (dom.guideGrid) {
    renderGuideCards(dom.guideGrid, buildDefaultGuides(state.data.items || []));
  }

  updateListingMeta(CONFIG.seo.defaultTitle, CONFIG.seo.defaultDescription);
}

function renderCategoryPage() {
  if (!state.data) return;
  stopHeroAutoplay();
  renderBrowseDecorations();
  refreshListing();
}

function getCompareItems() {
  if (!state.data) return [];
  return state.data.items.filter((item) => state.compareSet.has(item.slug));
}

function renderComparePage() {
  if (!state.data) return;

  stopHeroAutoplay();

  const items = getCompareItems();
  const title = `Compare items | ${CONFIG.site.name}`;
  const description = "Compare selected smart home automation and security items side by side.";
  updateListingMeta(title, description);

  if (dom.resultsTitle) dom.resultsTitle.textContent = "Compare list";
  if (dom.resultsCount) dom.resultsCount.textContent = `${items.length} items`;
  renderCountsNote(dom.resultsNote, items.length ? "Selected items for comparison." : "Add items from product cards to compare them here.");

  if (dom.productsGrid) {
    if (!items.length) {
      renderEmptyState(
        dom.productsGrid,
        "No items selected",
        "Use product card compare buttons or the compare drawer to add items."
      );
    } else {
      renderProductsGrid(dom.productsGrid, items, {
        compareSet: state.compareSet,
        onCompareToggle: (item, nextState) => {
          if (nextState) addToCompare(item.slug);
          else removeFromCompare(item.slug);
        },
      });
    }
  }

  if (dom.loadMoreButton) dom.loadMoreButton.hidden = true;
  if (dom.guideGrid) {
    renderGuideCards(dom.guideGrid, buildDefaultGuides(items.length ? items : state.data.items || []));
  }

  renderCompareDrawerPanel();
}

async function renderProductPage() {
  if (!state.data) return;
  stopHeroAutoplay();

  const query = parseQuery();
  const slug = query.slug || query.id || "";
  if (!slug) {
    window.location.href = "./";
    return;
  }

  const item = await getItemBySlug(slug);
  if (!item) {
    updateListingMeta("Item not found | Smart Home Automation", "The requested item could not be found.");
    if (dom.productDetailMount) {
      dom.productDetailMount.innerHTML = "<p>Item not found.</p>";
    }
    return;
  }

  updateListingMeta(
    item.meta_title || item.h1 || item.item_name || CONFIG.seo.defaultTitle,
    item.meta_description || item.short_summary || buildGuideFromHtml(item.html || "") || CONFIG.seo.defaultDescription
  );

  const relatedItems = (state.data.items || [])
    .filter((entry) => entry.slug !== item.slug)
    .filter((entry) =>
      matchesBrand(entry, item.brand_slug || item.brand_name) ||
      matchesCategory(entry, item.category || item.item_type) ||
      matchesLabel(entry, item.item_type)
    )
    .slice(0, CONFIG.ui.maxRelatedItems);

  const crumbs = [
    { label: "Home", href: "./" },
    {
      label: item.brand_name || item.category || item.item_type || "Items",
      href: item.brand_name
        ? `category.html?brand=${encodeURIComponent(slugify(item.brand_slug || item.brand_name))}`
        : `category.html?category=${encodeURIComponent(slugify(item.category || item.item_type || ""))}`,
    },
    { label: item.item_name || "Item" },
  ];

  if (dom.breadcrumbMount) {
    renderBreadcrumbs(dom.breadcrumbMount, crumbs);
  }

  if (dom.productDetailMount) {
    renderProductDetail(dom.productDetailMount, item, {
      relatedItems,
      onBuyClick: () => true,
    });
  }

  renderPageSchema(item, crumbs);
}

function renderCurrentListingPage() {
  if (!(state.route === "home" || state.route === "category")) return;
  if (state.route === "home") renderHomePage();
  else renderCategoryPage();
}

function syncStateFromUrlAndRender() {
  setListingStateFromUrl();

  if (state.route === "home" || state.route === "category") {
    renderCurrentListingPage();
  } else if (state.route === "compare") {
    renderComparePage();
  }
}

function showInitialLoading() {
  if (dom.productsGrid) renderLoadingState(dom.productsGrid, 4);
}

async function loadBaseData() {
  state.data = await getAllData();
}

async function main() {
  cacheDom();
  applyThemePreference();
  state.route = currentRoute();
  applyCompareStateFromStorage();

  if (state.route === "home" || state.route === "category" || state.route === "compare") {
    showInitialLoading();
  }

  await loadBaseData();

  setupHeaderControls();
  setupSearch();
  setupFilters();
  setupHero();
  setupLoadMore();
  setupCompareDrawerActions();

  syncStateFromUrlAndRender();

  if (state.route === "home") {
    renderHomePage();
    startHeroAutoplay();
  } else if (state.route === "category") {
    renderCategoryPage();
  } else if (state.route === "compare") {
    renderComparePage();
  } else if (state.route === "product") {
    await renderProductPage();
  }

  window.addEventListener("storage", (event) => {
    if (event.key === CONFIG.storage.compareKey) {
      applyCompareStateFromStorage();
      if (state.route === "compare") {
        renderComparePage();
      } else if (state.route === "home" || state.route === "category") {
        renderVisibleItems();
      }
    }

    if (event.key === CONFIG.storage.themeKey) {
      applyThemePreference();
    }
  });

  window.addEventListener("popstate", () => {
    state.route = currentRoute();
    syncStateFromUrlAndRender();
    if (state.route === "product") renderProductPage();
  });

  if (dom.searchInput && state.searchQuery) {
    dom.searchInput.value = state.searchQuery;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  main().catch((error) => {
    console.error("[app] initialization failed:", error);
    setDocumentMeta({
      title: CONFIG.seo.defaultTitle,
      description: CONFIG.seo.defaultDescription,
      ogImage: CONFIG.seo.defaultOgImage,
    });

    if (dom.productsGrid) {
      dom.productsGrid.innerHTML = "<p>Failed to load data.</p>";
    }
  });
});