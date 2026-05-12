import { CONFIG } from "./config.js";
import {
  createEl,
  escapeHtml,
  formatDate,
  getComparisonKey,
  getImageAlt,
  getImageArray,
  getImageUrl,
  getItemDisplayType,
  getLabelKeys,
  getPriceBandClass,
  isExternalUrl,
  safeJsonParse,
  scoreTier,
  slugify,
  sortItems,
  stripHtml,
  toCurrency,
  toNumber,
  uniqueStrings,
} from "./utils.js";

function getTemplate(id) {
  return document.getElementById(id);
}

function cloneTemplate(id) {
  const tpl = getTemplate(id);
  if (!tpl || !tpl.content || !tpl.content.firstElementChild) return null;
  return tpl.content.firstElementChild.cloneNode(true);
}

function ensureMeta(selector, attr, value, fallback = "") {
  let tag = document.querySelector(selector);
  if (!tag) {
    tag = document.createElement("meta");
    if (selector.includes('property="')) {
      const prop = selector.match(/property="([^"]+)"/)?.[1] || "";
      if (prop) tag.setAttribute("property", prop);
    }
    if (selector.includes('name="')) {
      const name = selector.match(/name="([^"]+)"/)?.[1] || "";
      if (name) tag.setAttribute("name", name);
    }
    document.head.appendChild(tag);
  }

  const finalValue = value === undefined || value === null || value === "" ? fallback : value;
  if (finalValue !== undefined && finalValue !== null) {
    tag.setAttribute(attr, String(finalValue));
  }
  return tag;
}

export function setDocumentMeta({
  title = CONFIG.seo.defaultTitle,
  description = CONFIG.seo.defaultDescription,
  ogTitle = title,
  ogDescription = description,
  ogImage = CONFIG.seo.defaultOgImage,
  twitterCard = CONFIG.seo.twitterCard,
  canonicalUrl = window.location.href,
  robots = CONFIG.seo.robots,
  type = "website",
} = {}) {
  document.title = title;

  ensureMeta('meta[name="description"]', "content", description);
  ensureMeta('meta[name="robots"]', "content", robots);
  ensureMeta('meta[property="og:type"]', "content", type);
  ensureMeta('meta[property="og:title"]', "content", ogTitle);
  ensureMeta('meta[property="og:description"]', "content", ogDescription);
  ensureMeta('meta[property="og:image"]', "content", ogImage);
  ensureMeta('meta[property="og:url"]', "content", canonicalUrl);
  ensureMeta('meta[name="twitter:card"]', "content", twitterCard);
  ensureMeta('meta[name="twitter:title"]', "content", title);
  ensureMeta('meta[name="twitter:description"]', "content", description);
  ensureMeta('meta[name="twitter:image"]', "content", ogImage);

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", canonicalUrl || window.location.href);
}

export function injectJsonLd(json, id = "jsonld") {
  if (!json) return null;
  const existing = document.getElementById(id);
  if (existing) existing.remove();

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = id;
  script.textContent = JSON.stringify(json);
  document.head.appendChild(script);
  return script;
}

export function injectMultipleJsonLd(jsonList = [], baseId = "jsonld") {
  const groupId = `${baseId}-group`;
  document.querySelectorAll(`script[data-jsonld-group="${groupId}"]`).forEach((el) => el.remove());

  jsonList
    .filter(Boolean)
    .forEach((json, index) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.jsonldGroup = groupId;
      script.id = `${groupId}-${index}`;
      script.textContent = JSON.stringify(json);
      document.head.appendChild(script);
    });
}

export function renderBreadcrumbs(container, crumbs = []) {
  if (!container) return;
  container.innerHTML = "";

  const nav = createEl("nav", "breadcrumbs", { "aria-label": "Breadcrumb" });
  const list = createEl("ol", "breadcrumbs__list");

  crumbs.forEach((crumb, index) => {
    const li = createEl("li", "breadcrumbs__item");
    if (index < crumbs.length - 1 && crumb.href) {
      const a = createEl("a", "breadcrumbs__link", { href: crumb.href }, crumb.label || "");
      li.appendChild(a);
    } else {
      li.textContent = crumb.label || "";
    }
    list.appendChild(li);
  });

  nav.appendChild(list);
  container.appendChild(nav);
}

export function renderHeroSlider(container, banners = []) {
  if (!container) return;

  container.innerHTML = "";

  const slides = banners.length
    ? banners
    : [
        {
          title: CONFIG.seo.defaultTitle,
          subtitle: CONFIG.seo.defaultDescription,
          image: CONFIG.seo.defaultOgImage,
          ctaText: "Browse products",
          ctaLink: "#browseSection",
        },
      ];

  slides.forEach((banner, index) => {
    const slide = createEl("article", `hero__slide${index === 0 ? " hero__slide--active" : ""}`);
    const content = createEl("div", "hero__content");

    const eyebrow = createEl("span", "hero__eyebrow", {}, "Smart Home Discovery");
    const title = createEl("h1", "", {}, banner.title || CONFIG.seo.defaultTitle);
    const subtitle = createEl("p", "", {}, banner.subtitle || CONFIG.seo.defaultDescription);

    const actions = createEl("div", "hero__actions");
    const cta = createEl("a", "primary-button", { href: banner.ctaLink || "#browseSection" }, banner.ctaText || "Browse products");
    const compare = createEl("a", "secondary-button", { href: "compare.html" }, "Compare items");

    actions.append(cta, compare);
    content.append(eyebrow, title, subtitle, actions);

    const visual = createEl("div", "hero__visual", { "aria-hidden": "true" });
    const large = createEl("div", "hero__card hero__card--large");
    const small = createEl("div", "hero__card hero__card--small");

    if (banner.image) {
      large.style.backgroundImage = `linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)), url("${banner.image}")`;
      large.style.backgroundSize = "cover";
      large.style.backgroundPosition = "center";
      large.style.backgroundBlendMode = "screen";
    }

    visual.append(large, small);
    slide.append(content, visual);
    container.appendChild(slide);
  });
}

export function setHeroSlide(container, index = 0) {
  if (!container) return;
  const slides = Array.from(container.querySelectorAll(".hero__slide"));
  if (!slides.length) return;

  const nextIndex = ((index % slides.length) + slides.length) % slides.length;
  slides.forEach((slide, i) => {
    slide.classList.toggle("hero__slide--active", i === nextIndex);
    slide.style.display = i === nextIndex ? "grid" : "none";
  });
}

export function renderBrandStrip(container, brands = [], options = {}) {
  if (!container) return;
  const { onBrandClick = null, visibleLimit = CONFIG.ui.brandStripVisibleCount } = options;
  container.innerHTML = "";

  brands.slice(0, visibleLimit).forEach((brand) => {
    const tpl = cloneTemplate("brandCardTemplate");
    const card = tpl || createEl("a", "brand-card");

    const slug = brand.brand_slug || slugify(brand.brand_name);
    const href = brand.href || `category.html?brand=${encodeURIComponent(slug)}`;
    const logo = card.querySelector(".brand-card__logo");
    const name = card.querySelector(".brand-card__name");

    card.setAttribute("href", href);

    if (logo) {
      logo.src = brand.brand_logo_url || CONFIG.placeholders.logo || CONFIG.seo.defaultOgImage;
      logo.alt = brand.brand_name || "Brand logo";
      logo.loading = "lazy";
    }

    if (name) {
      name.textContent = brand.brand_name || brand.title || slug;
    }

    if (onBrandClick) {
      card.addEventListener("click", (event) => {
        const result = onBrandClick(brand, event);
        if (result === false) event.preventDefault();
      });
    }

    container.appendChild(card);
  });
}

export function renderChips(container, entries = [], options = {}) {
  if (!container) return;

  const {
    activeKey = "",
    onChipClick = null,
    keyField = "key",
    titleField = "title",
    hrefBuilder = null,
  } = options;

  container.innerHTML = "";

  entries.forEach((entry) => {
    const key = String(entry?.[keyField] ?? "").trim();
    const title = String(entry?.[titleField] ?? key).trim();
    if (!key && !title) return;

    const tpl = cloneTemplate("chipTemplate");
    const chip = tpl || createEl("button", "chip", { type: "button" });
    const isActive = slugify(activeKey) === slugify(key);

    chip.classList.toggle("is-active", isActive);
    chip.textContent = title;

    if (hrefBuilder) {
      const href = hrefBuilder(entry);
      if (href) {
        chip.addEventListener("click", () => {
          window.location.href = href;
        });
      }
    } else if (onChipClick) {
      chip.addEventListener("click", (event) => {
        const result = onChipClick(entry, event);
        if (result === false) event.preventDefault();
      });
    }

    container.appendChild(chip);
  });
}

export function renderLabelAndCategoryChips(labelContainer, categoryContainer, labels = [], categories = [], handlers = {}) {
  renderChips(labelContainer, labels, {
    keyField: "key",
    titleField: "title",
    activeKey: handlers.activeLabel || "",
    onChipClick: handlers.onLabelClick || null,
  });

  renderChips(categoryContainer, categories.map((cat) => ({
    key: cat,
    title: cat,
  })), {
    keyField: "key",
    titleField: "title",
    activeKey: handlers.activeCategory || "",
    onChipClick: handlers.onCategoryClick || null,
  });
}

export function renderFilterOptions(container, options = [], selected = new Set(), handlers = {}) {
  if (!container) return;
  const { onToggle = null, inputName = "filter" } = handlers;
  container.innerHTML = "";

  options.forEach((option) => {
    const key = String(option.key || option.value || "").trim();
    const title = String(option.title || option.label || key).trim();
    const id = `${inputName}-${slugify(key)}`;

    const wrap = createEl("label", "filter-option", { for: id });
    const input = createEl("input", "", {
      type: "checkbox",
      id,
      name: inputName,
    });

    input.checked = selected.has(key);
    input.value = key;

    if (onToggle) {
      input.addEventListener("change", (event) => onToggle(key, event.target.checked, option));
    }

    const text = createEl("span", "", {}, title);
    wrap.append(input, text);
    container.appendChild(wrap);
  });
}

export function renderSelectOptions(selectEl, options = [], selectedValue = "") {
  if (!selectEl) return;
  selectEl.innerHTML = "";

  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = String(option.value ?? option.key ?? "");
    opt.textContent = String(option.label ?? option.title ?? option.value ?? "");
    if (String(opt.value) === String(selectedValue)) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

export function renderSearchSuggestions(container, results = [], options = {}) {
  if (!container) return;
  const { onPick = null } = options;
  container.innerHTML = "";

  if (!results.length) {
    container.hidden = true;
    return;
  }

  container.hidden = false;

  results.slice(0, CONFIG.ui.maxSearchSuggestions).forEach((result) => {
    const item = result.data || result;
    const type = result.type || item.type || "item";

    const label =
      type === "brand"
        ? item.brand_name || item.title
        : type === "label"
          ? item.title || item.key
          : item.item_name || item.title;

    const row = createEl("button", "suggestion", { type: "button" });
    row.innerHTML = `
      <strong>${escapeHtml(label || "")}</strong>
      <span>${escapeHtml(type)}</span>
    `;

    row.addEventListener("click", (event) => {
      if (onPick) {
        const keep = onPick(result, event);
        if (keep === false) return;
      }

      if (type === "brand") {
        window.location.href = `category.html?brand=${encodeURIComponent(item.brand_slug || slugify(item.brand_name || ""))}`;
      } else if (type === "label") {
        window.location.href = `category.html?label=${encodeURIComponent(item.key || slugify(item.title || ""))}`;
      } else {
        window.location.href = `product.html?slug=${encodeURIComponent(item.slug || slugify(item.item_name || ""))}`;
      }
    });

    container.appendChild(row);
  });
}

export function renderProductCard(item, options = {}) {
  const {
    onCompareToggle = null,
    compareSet = new Set(),
    onCardClick = null,
    cardHref = null,
  } = options;

  const tpl = cloneTemplate("productCardTemplate");
  const card = tpl || createEl("article", "product-card");

  const href = cardHref || `product.html?slug=${encodeURIComponent(item.slug || slugify(item.item_name || ""))}`;
  const imageLink = card.querySelector(".product-card__image-link");
  const image = card.querySelector(".product-card__image");
  const badge = card.querySelector(".badge--label");
  const score = card.querySelector(".score-pill");
  const title = card.querySelector(".product-card__title");
  const summary = card.querySelector(".product-card__summary");
  const meta = card.querySelector(".product-card__meta");
  const detailLink = card.querySelector(".product-card__detail-link");
  const buyLink = card.querySelector(".product-card__buy-link");
  const actions = card.querySelector(".product-card__actions");

  const imageData = {
    src: getImageUrl(item) || CONFIG.seo.defaultOgImage,
    alt: getImageAlt(item),
  };

  const label = getItemDisplayType(item);

  if (imageLink) imageLink.href = href;
  if (image) {
    image.src = imageData.src;
    image.alt = imageData.alt;
    image.loading = "lazy";
  }
  if (badge) badge.textContent = label;
  if (score) score.textContent = `${toNumber(item.featured_score, 0)} • ${scoreTier(item.featured_score)}`;
  if (title) title.textContent = item.item_name || item.title || "Untitled item";
  if (summary) summary.textContent = item.short_summary || stripHtml(item.html || "") || "Smart home product details available.";

  if (meta) {
    const entries = [
      item.brand_name,
      item.price ? toCurrency(item.price, item.currency || CONFIG.site.currencyFallback) : "",
      item.price_band,
      item.affiliate_platform,
    ].filter(Boolean);
    meta.textContent = entries.join(" • ");
  }

  if (detailLink) detailLink.href = href;

  if (buyLink) {
    buyLink.href = item.affiliate_url || "#";
    buyLink.textContent = item.affiliate_platform ? `Buy on ${item.affiliate_platform}` : "Buy now";

    if (!item.affiliate_url) {
      buyLink.setAttribute("aria-disabled", "true");
      buyLink.removeAttribute("target");
      buyLink.removeAttribute("rel");
    } else if (isExternalUrl(item.affiliate_url)) {
      buyLink.target = "_blank";
      buyLink.rel = "noopener noreferrer";
    }
  }

  if (onCardClick) {
    card.addEventListener("click", (event) => {
      const anchor = event.target.closest("a");
      if (anchor) return true;
      const result = onCardClick(item, event);
      if (result === false) event.preventDefault();
    });
  }

  if (onCompareToggle && actions && !card.querySelector(".compare-toggle")) {
    const toggle = createEl("button", "secondary-button compare-toggle", { type: "button" });
    const checked = compareSet.has(item.slug);
    toggle.textContent = checked ? "Remove compare" : "Add compare";

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      const nextState = !compareSet.has(item.slug);
      const result = onCompareToggle(item, nextState, event);
      if (result !== false) {
        if (nextState) compareSet.add(item.slug);
        else compareSet.delete(item.slug);
        toggle.textContent = nextState ? "Remove compare" : "Add compare";
      }
    });

    actions.appendChild(toggle);
  }

  return card;
}

export function renderProductsGrid(container, items = [], options = {}) {
  if (!container) return;
  const {
    compareSet = new Set(),
    onCompareToggle = null,
    onCardClick = null,
    cardHref = null,
  } = options;

  container.innerHTML = "";
  items.forEach((item) => {
    const card = renderProductCard(item, { compareSet, onCompareToggle, onCardClick, cardHref });
    container.appendChild(card);
  });
}

export function renderGuideCards(container, guides = []) {
  if (!container) return;
  container.innerHTML = "";

  guides.forEach((guide) => {
    const tpl = cloneTemplate("guideCardTemplate");
    const card = tpl || createEl("article", "guide-card");
    const title = card.querySelector("h3") || createEl("h3");
    const body = card.querySelector("p") || createEl("p");
    const link = card.querySelector("a") || createEl("a", "text-link", { href: "#" }, "Read more");

    title.textContent = guide.title || "";
    body.textContent = guide.description || "";
    link.href = guide.href || "#";
    link.textContent = guide.linkText || "Read more";

    if (!card.contains(title)) card.appendChild(title);
    if (!card.contains(body)) card.appendChild(body);
    if (!card.contains(link)) card.appendChild(link);

    container.appendChild(card);
  });
}

export function renderEmptyState(container, title = "No results found", message = "Try adjusting filters or search terms.") {
  if (!container) return;
  container.innerHTML = "";

  const wrap = createEl("div", "empty-state");
  wrap.innerHTML = `
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(message)}</p>
  `;
  container.appendChild(wrap);
}

export function renderLoadingState(container, rows = 4) {
  if (!container) return;
  container.innerHTML = "";

  for (let i = 0; i < rows; i++) {
    const card = createEl("article", "product-card product-card--skeleton");
    card.innerHTML = `
      <div class="skeleton skeleton--image"></div>
      <div class="product-card__body">
        <div class="skeleton skeleton--line"></div>
        <div class="skeleton skeleton--line"></div>
        <div class="skeleton skeleton--line"></div>
        <div class="skeleton skeleton--line"></div>
      </div>
    `;
    container.appendChild(card);
  }
}

export function renderResultsHeader(container, title, count = 0, note = "") {
  if (!container) return;
  container.textContent = `${title} (${count})`;

  const noteEl = document.getElementById("resultsNote");
  if (noteEl) {
    noteEl.textContent = note || "";
    noteEl.hidden = !note;
  }
}

export function renderCompareDrawer(container, items = [], options = {}) {
  if (!container) return;
  const { onRemove = null, onClear = null } = options;
  container.innerHTML = "";

  if (!items.length) {
    const empty = createEl("div", "compare-drawer__empty", {}, "No items selected yet.");
    container.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const row = createEl("div", "compare-drawer__item");
    const left = createEl("div", "compare-drawer__item-left");
    const title = createEl("strong", "", {}, item.item_name || "Untitled");
    const meta = createEl("small", "", {}, [item.brand_name, item.category].filter(Boolean).join(" • "));
    left.append(title, meta);

    const remove = createEl("button", "text-link", { type: "button" }, "Remove");
    remove.addEventListener("click", (event) => {
      event.preventDefault();
      if (onRemove) onRemove(item);
    });

    row.append(left, remove);
    container.appendChild(row);
  });

  if (onClear) {
    const clear = createEl("button", "secondary-button", { type: "button" }, "Clear all");
    clear.addEventListener("click", (event) => {
      event.preventDefault();
      onClear();
    });
    container.appendChild(clear);
  }
}

export function renderProductDetail(container, item, options = {}) {
  if (!container || !item) return;

  const { relatedItems = [], onBuyClick = null } = options;
  const images = getImageArray(item);
  const imageList = images.length ? images : [{ url: getImageUrl(item), alt: getImageAlt(item), caption: "" }];
  const safeImages = imageList.filter((img) => img && img.url);

  container.innerHTML = "";

  const root = createEl("article", "product-detail");

  const hero = createEl("section", "product-detail__hero");
  const media = createEl("div", "product-detail__media");
  const slider = createEl("div", "image-slider");

  const mainImage = createEl("img", "image-slider__main", {
    src: safeImages[0]?.url || CONFIG.seo.defaultOgImage,
    alt: safeImages[0]?.alt || getImageAlt(item),
  });

  const controls = createEl("div", "image-slider__controls");
  const prev = createEl("button", "icon-button", { type: "button", "aria-label": "Previous image" }, "‹");
  const next = createEl("button", "icon-button", { type: "button", "aria-label": "Next image" }, "›");
  controls.append(prev, next);

  const thumbs = createEl("div", "image-slider__thumbs");
  let currentIndex = 0;

  const setImage = (index) => {
    if (!safeImages.length) return;
    currentIndex = ((index % safeImages.length) + safeImages.length) % safeImages.length;
    const img = safeImages[currentIndex];
    mainImage.src = img.url || CONFIG.seo.defaultOgImage;
    mainImage.alt = img.alt || getImageAlt(item);
  };

  safeImages.forEach((img, idx) => {
    const thumb = createEl("button", "image-slider__thumb", { type: "button", "aria-label": `View image ${idx + 1}` });
    const thumbImg = createEl("img", "", {
      src: img.url || CONFIG.seo.defaultOgImage,
      alt: img.alt || `Image ${idx + 1}`,
      loading: "lazy",
    });

    thumb.appendChild(thumbImg);
    thumb.addEventListener("click", () => setImage(idx));
    thumbs.appendChild(thumb);
  });

  prev.addEventListener("click", () => setImage(currentIndex - 1));
  next.addEventListener("click", () => setImage(currentIndex + 1));

  slider.append(mainImage, controls, thumbs);
  media.appendChild(slider);

  const content = createEl("div", "product-detail__content");
  content.innerHTML = `
    <div class="product-detail__top">
      <span class="badge">${escapeHtml(getItemDisplayType(item))}</span>
      <span class="score-pill">${escapeHtml(String(toNumber(item.featured_score, 0)))} • ${escapeHtml(scoreTier(item.featured_score))}</span>
    </div>
    <h1>${escapeHtml(item.h1 || item.item_name || "Untitled item")}</h1>
    <p class="product-detail__summary">${escapeHtml(item.short_summary || stripHtml(item.html || ""))}</p>
  `;

  const meta = createEl("div", "product-detail__meta");
  meta.innerHTML = `
    <div><strong>Brand:</strong> ${escapeHtml(item.brand_name || "")}</div>
    <div><strong>Price:</strong> ${escapeHtml(item.price ? toCurrency(item.price, item.currency || CONFIG.site.currencyFallback) : "N/A")}</div>
    <div><strong>Platform:</strong> ${escapeHtml(item.affiliate_platform || "Affiliate")}</div>
    <div><strong>Updated:</strong> ${escapeHtml(formatDate(item.updated_at) || "")}</div>
  `;

  const actions = createEl("div", "product-detail__actions");
  const buy = createEl("a", "primary-button", {
    href: item.affiliate_url || "#",
    target: item.affiliate_url ? "_blank" : null,
    rel: item.affiliate_url ? "noopener noreferrer" : null,
  }, item.affiliate_platform ? `Buy on ${item.affiliate_platform}` : "Buy now");

  if (onBuyClick) {
    buy.addEventListener("click", (event) => {
      const result = onBuyClick(item, event);
      if (result === false) event.preventDefault();
    });
  }

  actions.appendChild(buy);

  const sections = createEl("div", "product-detail__sections");

  if (item.html) {
    const htmlWrap = createEl("div", "product-detail__html");
    htmlWrap.innerHTML = item.html;
    sections.appendChild(htmlWrap);
  }

  if (item.specs_json && Object.keys(item.specs_json).length) {
    const specs = createEl("section", "spec-table-section");
    specs.innerHTML = `<h2>Specifications</h2>`;
    const table = createEl("table", "spec-table");
    const tbody = document.createElement("tbody");

    Object.entries(item.specs_json).forEach(([key, value]) => {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.textContent = titleCase(key.replace(/_/g, " "));
      const td = document.createElement("td");
      td.textContent = Array.isArray(value)
        ? value.join(", ")
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
      tr.append(th, td);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    specs.appendChild(table);
    sections.appendChild(specs);
  }

  if (relatedItems.length) {
    const related = createEl("section", "related-section");
    related.innerHTML = `<h2>Related items</h2>`;
    const grid = createEl("div", "cards-grid");

    relatedItems.slice(0, CONFIG.ui.maxRelatedItems).forEach((relatedItem) => {
      grid.appendChild(renderProductCard(relatedItem));
    });

    related.appendChild(grid);
    sections.appendChild(related);
  }

  hero.append(media, content);
  content.append(meta, actions);
  root.append(hero, sections);
  container.appendChild(root);
}

export function renderPageSchema(item, crumbs = []) {
  const scripts = [];

  if (item?.schema_jsonld && CONFIG.schema.enableProductSchema) scripts.push(item.schema_jsonld);
  if (item?.breadcrumb_jsonld && CONFIG.schema.enableBreadcrumbSchema) scripts.push(item.breadcrumb_jsonld);
  if (item?.faq_jsonld && CONFIG.schema.enableFaqSchema) scripts.push(item.faq_jsonld);

  if (!scripts.length && crumbs.length && CONFIG.schema.enableBreadcrumbSchema) {
    scripts.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.label,
        item: crumb.href ? new URL(crumb.href, window.location.href).href : window.location.href,
      })),
    });
  }

  injectMultipleJsonLd(scripts, `page-${item?.slug || "page"}`);
}

export function buildGuideFromHtml(html = "") {
  const text = stripHtml(html);
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.slice(0, 3).join(" ");
}

export function buildDefaultGuides(items = []) {
  const categories = uniqueStrings(items.map((item) => item.category || item.item_type)).slice(0, 6);
  return categories.map((category) => ({
    title: `Best ${category} products`,
    description: `Browse and compare top ${category} products with buying advice and smart-home compatibility notes.`,
    href: `category.html?category=${encodeURIComponent(slugify(category))}`,
    linkText: "View items",
  }));
}

export function buildFacetedCount(items, field) {
  const counts = new Map();

  items.forEach((item) => {
    const value = item?.[field];
    const values = Array.isArray(value) ? value : [value];
    values.filter(Boolean).forEach((entry) => {
      const key = String(entry).trim();
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });

  return counts;
}

export function renderFacetChips(container, counts = new Map(), options = {}) {
  if (!container) return;
  const { onPick = null } = options;
  container.innerHTML = "";

  Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .forEach(([key, count]) => {
      const chip = createEl("button", "chip", { type: "button" }, `${key} (${count})`);
      chip.addEventListener("click", (event) => {
        if (onPick) {
          const result = onPick(key, count, event);
          if (result === false) return;
        }
      });
      container.appendChild(chip);
    });
}

export function renderCountsNote(container, text) {
  if (!container) return;
  container.textContent = text || "";
  container.hidden = !text;
}

export function renderSortedProducts(items, sortBy = "featured") {
  return sortItems(items, sortBy);
}