import { CONFIG } from "./config.js";

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function stripHtml(value) {
  return String(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeText(value) {
  return stripHtml(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(value) {
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

export function titleCase(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

export function toCurrency(value, currency = CONFIG.site.currencyFallback) {
  const num = toNumber(value, NaN);
  if (!Number.isFinite(num)) return "";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${currency} ${Math.round(num)}`;
  }
}

export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function unique(values) {
  return Array.from(
    new Set((values || []).filter((v) => v !== null && v !== undefined && String(v).trim() !== ""))
  );
}

export function uniqueStrings(values) {
  return unique((values || []).map((v) => String(v).trim())).filter(Boolean);
}

export function arrayify(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return String(value)
    .split(/[|,;]+/g)
    .map((v) => v.trim())
    .filter(Boolean);
}

export function safeJsonParse(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

export function deepClone(value) {
  try {
    return structuredClone(value);
  } catch {
    return safeJsonParse(JSON.stringify(value), value);
  }
}

export function setDeep(target, path, value) {
  if (!target || typeof target !== "object") return target;
  const parts = String(path || "")
    .split(".")
    .map((p) => p.trim())
    .filter(Boolean);

  if (!parts.length) return target;

  let cursor = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!cursor[key] || typeof cursor[key] !== "object") cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[parts[parts.length - 1]] = value;
  return target;
}

export function getDeep(target, path, fallback = undefined) {
  const parts = String(path || "")
    .split(".")
    .map((p) => p.trim())
    .filter(Boolean);

  let cursor = target;
  for (const part of parts) {
    if (cursor === null || cursor === undefined) return fallback;
    cursor = cursor[part];
  }
  return cursor === undefined ? fallback : cursor;
}

export function debounce(fn, wait = 200) {
  let timer = null;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

export function throttle(fn, wait = 200) {
  let last = 0;
  let timer = null;
  return function throttled(...args) {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      clearTimeout(timer);
      timer = null;
      last = now;
      fn.apply(this, args);
      return;
    }
    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        last = Date.now();
        fn.apply(this, args);
      }, remaining);
    }
  };
}

export function requestIdle(callback, timeout = 800) {
  if ("requestIdleCallback" in window) {
    return window.requestIdleCallback(callback, { timeout });
  }
  return window.setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 0 }), 1);
}

export function cancelIdle(handle) {
  if ("cancelIdleCallback" in window) {
    window.cancelIdleCallback(handle);
  } else {
    clearTimeout(handle);
  }
}

export function createEl(tag, className = "", attrs = {}, text = "") {
  const el = document.createElement(tag);
  if (className) el.className = className;

  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;

    if (key === "dataset" && typeof value === "object") {
      for (const [dKey, dValue] of Object.entries(value)) {
        el.dataset[dKey] = String(dValue);
      }
      continue;
    }

    const attrName =
      key === "ariaLabel" ? "aria-label" :
      key === "ariaHidden" ? "aria-hidden" :
      key;

    try {
      if (attrName in el && !["aria-label", "aria-hidden"].includes(attrName)) {
        el[attrName] = value;
      } else {
        el.setAttribute(attrName, String(value));
      }
    } catch {
      el.setAttribute(attrName, String(value));
    }
  }

  if (text !== "") el.textContent = text;
  return el;
}

export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function on(el, event, handler, options = {}) {
  if (!el) return () => {};
  el.addEventListener(event, handler, options);
  return () => el.removeEventListener(event, handler, options);
}

export function toggleClass(el, className, force) {
  if (!el) return;
  el.classList.toggle(className, force);
}

export function parseQuery() {
  return Object.fromEntries(new URLSearchParams(window.location.search).entries());
}

export function updateQuery(params = {}, options = { replace: true }) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") url.searchParams.delete(key);
    else url.searchParams.set(key, String(value));
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (options.replace) history.replaceState({}, "", next);
  else history.pushState({}, "", next);
  return next;
}

export function scrollToTop(smooth = true) {
  window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
}

export function safeUrl(value, fallback = "#") {
  if (!value) return fallback;
  try {
    const url = new URL(value, window.location.href);
    return url.href;
  } catch {
    return fallback;
  }
}

export function isExternalUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value, window.location.href);
    return url.origin !== window.location.origin;
  } catch {
    return false;
  }
}

export function getImageArray(item) {
  if (Array.isArray(item?.images_json)) return item.images_json;
  if (typeof item?.images_json === "string") {
    const parsed = safeJsonParse(item.images_json, []);
    return Array.isArray(parsed) ? parsed : [];
  }
  return [];
}

export function getImageUrl(item) {
  return (
    item?.primary_image_url ||
    getImageArray(item)[0]?.url ||
    ""
  );
}

export function getImageAlt(item) {
  return (
    item?.primary_image_alt ||
    getImageArray(item)[0]?.alt ||
    item?.item_name ||
    item?.name ||
    item?.title ||
    "Product image"
  );
}

export function getLabelKeys(item) {
  return uniqueStrings([
    item?.item_type,
    item?.category,
    item?.subcategory,
  ].map((v) => slugify(v)).filter(Boolean));
}

export function getItemDisplayType(item) {
  return item?.item_type || item?.category || item?.subcategory || "Item";
}

export function getPriceBandClass(priceBand) {
  const band = slugify(priceBand);
  return band ? `price-band--${band}` : "price-band--unknown";
}

export function scoreTier(score) {
  const s = toNumber(score, 0);
  if (s >= 90) return "Elite";
  if (s >= 80) return "Excellent";
  if (s >= 70) return "Strong";
  if (s >= 60) return "Good";
  return "Basic";
}

export function scoreClass(score) {
  const s = toNumber(score, 0);
  if (s >= 90) return "is-elite";
  if (s >= 80) return "is-excellent";
  if (s >= 70) return "is-strong";
  if (s >= 60) return "is-good";
  return "is-basic";
}

export function toCompactList(items, limit = 4, separator = " • ") {
  return uniqueStrings(items)
    .slice(0, limit)
    .join(separator);
}

export function startsWithAny(text, terms = []) {
  const value = normalizeText(text);
  return terms.some((term) => value.startsWith(normalizeText(term)));
}

export function includesAny(text, terms = []) {
  const value = normalizeText(text);
  return terms.some((term) => value.includes(normalizeText(term)));
}

export function buildKeywordVariants(keyword) {
  const base = normalizeText(keyword);
  const cleaned = base.replace(/\bsmart\b/g, "");
  return uniqueStrings([
    base,
    cleaned,
    base.replace(/\s+/g, ""),
    base.replace(/\s+/g, "-"),
  ]);
}

export function scoreMatch(query, haystack) {
  const q = normalizeText(query);
  const h = normalizeText(haystack);
  if (!q || !h) return 0;
  if (h === q) return 100;
  if (h.includes(q)) return 90;

  const qParts = q.split(" ").filter(Boolean);
  if (!qParts.length) return 0;

  if (qParts.every((part) => h.includes(part))) return 80;

  const hParts = h.split(" ");
  let hits = 0;
  for (const part of qParts) {
    if (hParts.includes(part)) hits += 1;
  }

  return Math.round((hits / qParts.length) * 70);
}

export function sortItems(items, sortBy = "featured") {
  const list = [...(items || [])];

  const priceValue = (item) => toNumber(item?.price, Number.POSITIVE_INFINITY);
  const scoreValue = (item) => toNumber(item?.featured_score, 0);
  const nameValue = (item) => normalizeText(item?.item_name || item?.name || "");

  switch (sortBy) {
    case "score_desc":
      return list.sort((a, b) => scoreValue(b) - scoreValue(a));
    case "price_asc":
      return list.sort((a, b) => priceValue(a) - priceValue(b));
    case "price_desc":
      return list.sort((a, b) => priceValue(b) - priceValue(a));
    case "name_asc":
      return list.sort((a, b) => nameValue(a).localeCompare(nameValue(b)));
    case "featured":
    default:
      return list.sort(
        (a, b) =>
          (scoreValue(b) - scoreValue(a)) ||
          nameValue(a).localeCompare(nameValue(b))
      );
  }
}

export function paginate(list, pageSize = CONFIG.ui.initialPageSize, page = 1) {
  const currentPage = Math.max(1, toNumber(page, 1));
  const size = Math.max(1, pageSize);
  const start = (currentPage - 1) * size;

  return {
    page: currentPage,
    pageSize: size,
    total: list.length,
    totalPages: Math.max(1, Math.ceil(list.length / size)),
    items: list.slice(start, start + size),
  };
}

export function intersectSets(...arrays) {
  if (!arrays.length) return [];
  const normalized = arrays.map((arr) => new Set(arr));
  return [...normalized[0]].filter((value) => normalized.every((set) => set.has(value)));
}

export function unionSets(...arrays) {
  return uniqueStrings(arrays.flat());
}

export function getComparisonKey(item) {
  return item?.slug || item?.item_id || slugify(item?.item_name || "");
}

export function buildCanonicalUrl(pathname = window.location.pathname, query = window.location.search) {
  const url = new URL(window.location.href);
  url.pathname = pathname;
  url.search = query;
  url.hash = "";
  return url.href;
}