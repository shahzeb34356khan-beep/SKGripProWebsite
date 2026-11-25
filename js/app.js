/**
 * SK GRIP PRO - Main Application Script
 * File: js/app.js
 *
 * Load order on every page:
 *   1. js/config.js    -> window.STORE_CONFIG
 *   2. js/products.js  -> window.products
 *   3. js/app.js       -> this file
 *
 * Features:
 *  - Shared header, footer and mobile navigation
 *  - Shop page: product cards in #product-grid, search, category filter, sorting
 *  - Featured products and categories (home page)
 *  - Product details page, cart (localStorage), WhatsApp order buttons
 *  - Image fallback, clear error messages, GitHub Pages project-path support
 *
 * Payments: nothing is paid on this site. No card or bank details are
 * collected or stored. Prices marked unconfirmed are never presented as final.
 */
(function (window, document) {
  "use strict";

  /* ------------------------------------------------------------------ *
   * Settings
   * ------------------------------------------------------------------ */
  var CFG = window.STORE_CONFIG || {};
  var CFG_STORE = CFG.store || {};
  var CFG_CURRENCY = CFG.currency || {};
  var CFG_CONTACT = CFG.contact || {};

  var STORE_NAME = CFG_STORE.name || "SK GRIP PRO";
  var CURRENCY = CFG_CURRENCY.code || "USD";
  var LOCALE = CFG_CURRENCY.locale || "en-US";
  var PHONE = CFG_CONTACT.phone || "";
  var WHATSAPP = CFG_CONTACT.whatsapp || "";
  var EMAIL = CFG_CONTACT.email || "";

  var CART_KEY = "skgrippro_cart_v1";
  var MAX_QTY = 99;

  /* ------------------------------------------------------------------ *
   * GitHub Pages project path support
   * (works at https://user.github.io/SKGripProWebsite/ and anywhere else)
   * ------------------------------------------------------------------ */
  function detectBase() {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || "";
      if (/\/js\/app\.js(\?.*)?(#.*)?$/i.test(src)) {
        return src.replace(/js\/app\.js(\?.*)?(#.*)?$/i, "");
      }
    }
    var href = window.location.href.split("#")[0].split("?")[0];
    return href.replace(/[^\/]*$/, "");
  }

  var BASE = detectBase();

  function siteUrl(path) {
    return BASE + String(path || "").replace(/^\/+/, "");
  }

  function assetUrl(path) {
    var p = String(path || "");
    if (!p) {
      return "";
    }
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(p)) {
      return p;
    }
    return siteUrl(p);
  }

  /* ------------------------------------------------------------------ *
   * Product data
   * ------------------------------------------------------------------ */
  var PRODUCTS = [];
  var PRODUCTS_STATUS = "missing"; // "missing" | "empty" | "ok"

  function loadProducts() {
    var raw = window.products;
    var list = [];
    if (Array.isArray(raw)) {
      raw.forEach(function (p) {
        if (p && typeof p === "object" && p.id !== undefined && p.id !== null && p.name) {
          list.push(p);
        }
      });
      PRODUCTS_STATUS = list.length ? "ok" : "empty";
    } else {
      PRODUCTS_STATUS = "missing";
    }
    PRODUCTS = list;
  }

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */
  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function pick(ids) {
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el) {
        return el;
      }
    }
    return null;
  }

  function esc(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safe(fn) {
    try {
      fn();
    } catch (err) {
      if (window.console && console.error) {
        console.error("[SK GRIP PRO]", err);
      }
    }
  }

  function digitsOnly(value) {
    return String(value || "").replace(/\D+/g, "");
  }

  function truncate(text, max) {
    var s = String(text || "");
    return s.length > max ? s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : s;
  }

  function money(amount, currency) {
    var value = Number(amount);
    if (!isFinite(value)) {
      return "";
    }
    try {
      return new Intl.NumberFormat(LOCALE, { style: "currency", currency: currency || CURRENCY }).format(value);
    } catch (err) {
      return "$" + value.toFixed(2);
    }
  }

  function hasPrice(product) {
    return !(product.price === null || product.price === undefined || product.price === "" || !isFinite(Number(product.price)));
  }

  function isAvailable(product) {
    return product.available !== false;
  }

  function productUrl(product) {
    return siteUrl("product.html?id=" + encodeURIComponent(product.id));
  }

  function getProduct(id) {
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (String(PRODUCTS[i].id) === String(id)) {
        return PRODUCTS[i];
      }
    }
    return null;
  }

  function productImages(product) {
    var list = [];
    if (Array.isArray(product.images)) {
      list = product.images.filter(Boolean);
    }
    if (product.image && list.indexOf(product.image) === -1) {
      list.unshift(product.image);
    }
    return list.map(assetUrl);
  }

  var PLACEHOLDER_IMG =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">' +
        '<rect width="600" height="600" fill="#151515"/>' +
        '<rect x="20" y="20" width="560" height="560" fill="none" stroke="#c9ccd1" stroke-opacity=".35"/>' +
        '<text x="300" y="310" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" letter-spacing="6" fill="#c9ccd1">SK GRIP PRO</text>' +
        "</svg>"
    );

  function categories() {
    var seen = {};
    var list = [];
    PRODUCTS.forEach(function (p) {
      var c = p.category ? String(p.category).trim() : "";
      if (c && !seen[c]) {
        seen[c] = true;
        list.push(c);
      }
    });
    return list.sort();
  }

  function getQuery() {
    try {
      return new URLSearchParams(window.location.search);
    } catch (err) {
      return { get: function () { return null; } };
    }
  }

  function currentPage() {
    var file = (window.location.pathname.split("/").pop() || "").toLowerCase();
    file = file.replace(/\.html?$/, "");
    return file === "" ? "index" : file;
  }

  /* ------------------------------------------------------------------ *
   * WhatsApp helpers
   * ------------------------------------------------------------------ */
  function whatsappLink(message) {
    var number = digitsOnly(WHATSAPP);
    if (!number) {
      return "";
    }
    var base = "https://wa.me/" + number;
    return message ? base + "?text=" + encodeURIComponent(message) : base;
  }

  function priceTextForMessage(product) {
    if (!hasPrice(product)) {
      return "price to be confirmed";
    }
    var text = "listed price " + money(product.price, product.currency);
    if (product.priceConfirmed === false) {
      text += " - demo price, unconfirmed";
    }
    return text;
  }

  function closingLine() {
    return "Please confirm the final price, shipping details and payment options before I place my order. Thank you.";
  }

  function productOrderMessage(product, qty) {
    return (
      "Hello " + STORE_NAME + ", I would like to order:\n" +
      "- " + product.name + " x" + (qty || 1) + " (" + priceTextForMessage(product) + ")\n\n" +
      closingLine()
    );
  }

  function cartOrderMessage(rows, totals) {
    var lines = rows.map(function (row) {
      return "- " + row.product.name + " x" + row.qty + " (" + priceTextForMessage(row.product) + ")";
    });
    var message = "Hello " + STORE_NAME + ", I would like to order:\n" + lines.join("\n");
    if (totals.hasAnyPrice) {
      message += "\n\nEstimated total: " + money(totals.total) + " (not final";
      message += totals.unconfirmed ? ", includes unconfirmed prices" : "";
      message += ")";
    }
    return message + "\n\n" + closingLine();
  }

  function whatsappButton(message, label, extraClass) {
    var link = whatsappLink(message);
    var cls = "skgp-btn skgp-btn-outline" + (extraClass ? " " + extraClass : "");
    if (!link) {
      return '<a class="' + cls + '" href="' + siteUrl("contact.html") + '">Contact us</a>';
    }
    return (
      '<a class="' + cls + '" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' +
      esc(label || "Order on WhatsApp") +
      "</a>"
    );
    }  /* ------------------------------------------------------------------ *
   * Cart (localStorage - stores only product ids and quantities)
   * ------------------------------------------------------------------ */
  var memoryCart = [];

  function readCart() {
    var data = null;
    try {
      var raw = window.localStorage.getItem(CART_KEY);
      data = raw ? JSON.parse(raw) : [];
    } catch (err) {
      data = memoryCart;
    }
    if (!Array.isArray(data)) {
      return [];
    }
    var cleaned = [];
    data.forEach(function (item) {
      if (!item || item.id === undefined) {
        return;
      }
      var qty = parseInt(item.qty, 10);
      if (!isFinite(qty) || qty < 1) {
        return;
      }
      cleaned.push({ id: String(item.id), qty: Math.min(qty, MAX_QTY) });
    });
    return cleaned;
  }

  function writeCart(items) {
    memoryCart = items;
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch (err) {
      /* Storage unavailable. The cart stays in memory for this visit only. */
    }
  }

  function cartRows() {
    var rows = [];
    readCart().forEach(function (item) {
      var product = getProduct(item.id);
      if (product) {
        rows.push({ product: product, qty: item.qty });
      }
    });
    return rows;
  }

  function cartCount() {
    return readCart().reduce(function (sum, item) {
      return sum + item.qty;
    }, 0);
  }

  function cartTotals(rows) {
    var total = 0;
    var unconfirmed = false;
    var hasAnyPrice = false;
    var missingPrice = false;
    rows.forEach(function (row) {
      if (!isAvailable(row.product)) {
        return;
      }
      if (hasPrice(row.product)) {
        total += Number(row.product.price) * row.qty;
        hasAnyPrice = true;
        if (row.product.priceConfirmed === false) {
          unconfirmed = true;
        }
      } else {
        missingPrice = true;
      }
    });
    return { total: total, unconfirmed: unconfirmed, hasAnyPrice: hasAnyPrice, missingPrice: missingPrice };
  }

  function addToCart(id, qty) {
    var product = getProduct(id);
    if (!product || !isAvailable(product)) {
      showToast("This product is currently unavailable.");
      return;
    }
    var items = readCart();
    var found = false;
    items.forEach(function (item) {
      if (item.id === String(id)) {
        item.qty = Math.min(item.qty + (qty || 1), MAX_QTY);
        found = true;
      }
    });
    if (!found) {
      items.push({ id: String(id), qty: Math.min(qty || 1, MAX_QTY) });
    }
    writeCart(items);
    refreshCartUI();
    showToast(product.name + " added to your cart.");
  }

  function changeQty(id, delta) {
    var items = readCart()
      .map(function (item) {
        if (item.id === String(id)) {
          item.qty = Math.min(item.qty + delta, MAX_QTY);
        }
        return item;
      })
      .filter(function (item) {
        return item.qty > 0;
      });
    writeCart(items);
    refreshCartUI();
  }

  function removeFromCart(id) {
    writeCart(
      readCart().filter(function (item) {
        return item.id !== String(id);
      })
    );
    refreshCartUI();
  }

  function clearCart() {
    writeCart([]);
    refreshCartUI();
  }

  function refreshCartUI() {
    updateCartBadge();
    safe(renderCart);
  }

  function updateCartBadge() {
    var count = cartCount();
    $all("[data-cart-count]").forEach(function (el) {
      el.textContent = String(count);
      el.hidden = count === 0;
    });
  }

  /* ------------------------------------------------------------------ *
   * Toast message
   * ------------------------------------------------------------------ */
  var toastTimer = null;

  function showToast(message) {
    var toast = $(".skgp-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "skgp-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2600);
  }

  /* ------------------------------------------------------------------ *
   * Fallback styles (css/style.css loads later and overrides these)
   * ------------------------------------------------------------------ */
  function injectStyles() {
    if ($("#skgp-app-styles")) {
      return;
    }
    var css =
      ":root{--skgp-black:#0a0a0a;--skgp-charcoal:#151515;--skgp-graphite:#1f1f21;--skgp-silver:#c9ccd1;--skgp-silver-soft:#9ea2a9;--skgp-white:#fff;--skgp-line:rgba(201,204,209,.18)}" +
      ".skgp-header,.skgp-footer,.skgp-card,.skgp-cart,.skgp-detail,.skgp-empty{font-family:'Helvetica Neue',Arial,sans-serif;box-sizing:border-box}" +
      ".skgp-header *,.skgp-footer *,.skgp-card *,.skgp-cart *,.skgp-detail *,.skgp-empty *{box-sizing:border-box}" +
      ".skgp-header{position:sticky;top:0;z-index:1000;background:rgba(10,10,10,.96);border-bottom:1px solid var(--skgp-line)}" +
      ".skgp-header-inner{max-width:1200px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px}" +
      ".skgp-logo{color:var(--skgp-white);font-weight:800;letter-spacing:.18em;text-transform:uppercase;text-decoration:none;font-size:1.05rem;white-space:nowrap}" +
      ".skgp-nav{display:flex;align-items:center;gap:6px}" +
      ".skgp-nav a{color:var(--skgp-silver);text-decoration:none;padding:8px 12px;border-radius:999px;font-size:.88rem;letter-spacing:.06em;text-transform:uppercase}" +
      ".skgp-nav a:hover,.skgp-nav a[aria-current='page']{color:var(--skgp-white);background:rgba(201,204,209,.12)}" +
      ".skgp-header-actions{display:flex;align-items:center;gap:10px}" +
      ".skgp-cart-link{display:inline-flex;align-items:center;gap:8px;color:var(--skgp-white);text-decoration:none;padding:8px 14px;border:1px solid var(--skgp-silver);border-radius:999px;font-size:.85rem;letter-spacing:.06em;text-transform:uppercase}" +
      ".skgp-badge{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:var(--skgp-white);color:var(--skgp-black);font-size:.75rem;font-weight:700}" +
      ".skgp-badge[hidden]{display:none}" +
      ".skgp-menu-btn{display:none;width:44px;height:44px;border:1px solid var(--skgp-silver);border-radius:10px;background:transparent;color:var(--skgp-white);cursor:pointer;padding:0;align-items:center;justify-content:center;flex-direction:column;gap:5px}" +
      ".skgp-menu-btn span{display:block;width:20px;height:2px;background:currentColor}" +
      "@media (max-width:860px){.skgp-menu-btn{display:inline-flex}.skgp-nav{display:none;position:absolute;left:0;right:0;top:100%;flex-direction:column;align-items:stretch;gap:0;padding:10px 20px 18px;background:var(--skgp-black);border-bottom:1px solid var(--skgp-line)}.skgp-nav.is-open{display:flex}.skgp-nav a{padding:14px 12px;border-radius:8px}}" +
      ".skgp-footer{background:#080808;color:var(--skgp-silver);border-top:1px solid var(--skgp-line);margin-top:48px}" +
      ".skgp-footer-inner{max-width:1200px;margin:0 auto;padding:44px 20px 24px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:32px}" +
      ".skgp-footer h4{margin:0 0 14px;color:var(--skgp-white);font-size:.85rem;letter-spacing:.2em;text-transform:uppercase}" +
      ".skgp-footer p{margin:0 0 10px;line-height:1.7;font-size:.93rem}.skgp-footer ul{list-style:none;margin:0;padding:0}.skgp-footer li{margin:0 0 8px}" +
      ".skgp-footer a{color:var(--skgp-silver);text-decoration:none;overflow-wrap:anywhere}.skgp-footer a:hover{color:var(--skgp-white);text-decoration:underline}" +
      ".skgp-footer-bottom{max-width:1200px;margin:0 auto;padding:18px 20px 28px;border-top:1px solid var(--skgp-line);font-size:.82rem;color:var(--skgp-silver-soft);line-height:1.6}" +
      ".skgp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:20px}" +
      ".skgp-card{display:flex;flex-direction:column;border:1px solid var(--skgp-line);border-radius:14px;background:linear-gradient(160deg,var(--skgp-graphite),var(--skgp-charcoal));overflow:hidden;color:var(--skgp-silver)}" +
      ".skgp-card-media{display:block;aspect-ratio:1/1;background:#101010;overflow:hidden}" +
      ".skgp-card-media img{width:100%;height:100%;object-fit:cover;display:block}" +
      ".skgp-card-body{display:flex;flex-direction:column;gap:10px;padding:18px;flex:1}" +
      ".skgp-card h3{margin:0;font-size:1.05rem}.skgp-card h3 a{color:var(--skgp-white);text-decoration:none}" +
      ".skgp-tag{align-self:flex-start;font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:var(--skgp-silver-soft)}" +
      ".skgp-desc{margin:0;font-size:.92rem;line-height:1.6}" +
      ".skgp-price{display:flex;flex-direction:column;gap:2px;margin-top:auto}.skgp-price-main{color:var(--skgp-white);font-size:1.2rem;font-weight:700}.skgp-price-note{font-size:.76rem;color:var(--skgp-silver-soft)}" +
      ".skgp-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}" +
      ".skgp-btn{display:inline-flex;align-items:center;justify-content:center;padding:11px 20px;border-radius:999px;border:1px solid transparent;font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;cursor:pointer;font-family:inherit}" +
      ".skgp-btn-primary{background:linear-gradient(180deg,#fff,#b9bcc2);color:var(--skgp-black)}.skgp-btn-outline{background:transparent;color:var(--skgp-white);border-color:var(--skgp-silver)}" +
      ".skgp-unavailable{display:inline-block;padding:6px 12px;border:1px solid var(--skgp-line);border-radius:999px;font-size:.75rem;letter-spacing:.1em;text-transform:uppercase;color:var(--skgp-silver-soft)}" +
      ".skgp-chips{display:flex;flex-wrap:wrap;gap:10px}" +
      ".skgp-chip{display:inline-block;padding:9px 18px;border:1px solid var(--skgp-line);border-radius:999px;background:transparent;color:var(--skgp-silver);font-size:.82rem;text-decoration:none;cursor:pointer;font-family:inherit}" +
      ".skgp-chip:hover,.skgp-chip.is-active{border-color:var(--skgp-silver);color:var(--skgp-white);background:rgba(201,204,209,.1)}" +
      ".skgp-empty{padding:36px 22px;text-align:center;border:1px dashed var(--skgp-silver-soft);border-radius:14px;color:var(--skgp-silver);background:var(--skgp-charcoal);line-height:1.7}" +
      ".skgp-empty h3{margin:0 0 8px;color:var(--skgp-white)}.skgp-empty p{margin:0 0 16px}" +
      ".skgp-empty small{display:block;margin-top:10px;color:var(--skgp-silver-soft)}" +
      ".skgp-detail{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:32px;color:var(--skgp-silver)}" +
      ".skgp-gallery-main{aspect-ratio:1/1;border:1px solid var(--skgp-line);border-radius:14px;overflow:hidden;background:#101010}.skgp-gallery-main img{width:100%;height:100%;object-fit:cover;display:block}" +
      ".skgp-thumbs{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}" +
      ".skgp-thumb{width:64px;height:64px;padding:0;border:1px solid var(--skgp-line);border-radius:10px;overflow:hidden;background:#101010;cursor:pointer}.skgp-thumb.is-active{border-color:var(--skgp-silver)}.skgp-thumb img{width:100%;height:100%;object-fit:cover;display:block}" +
      ".skgp-detail h1{margin:6px 0 14px;color:var(--skgp-white);font-size:clamp(1.6rem,4vw,2.3rem)}.skgp-detail p{line-height:1.8}" +
      ".skgp-note{margin-top:18px;padding:14px 16px;border-left:3px solid var(--skgp-silver);background:var(--skgp-charcoal);border-radius:8px;font-size:.88rem;line-height:1.7}" +
      ".skgp-cart{display:flex;flex-direction:column;gap:14px;color:var(--skgp-silver)}" +
      ".skgp-cart-row{display:grid;grid-template-columns:84px 1fr;gap:14px;padding:14px;border:1px solid var(--skgp-line);border-radius:14px;background:linear-gradient(160deg,var(--skgp-graphite),var(--skgp-charcoal))}" +
      ".skgp-cart-row img{width:84px;height:84px;object-fit:cover;border-radius:10px;display:block;background:#101010}" +
      ".skgp-cart-info{display:flex;flex-direction:column;gap:8px;min-width:0}.skgp-cart-info>a{color:var(--skgp-white);text-decoration:none;font-weight:700;overflow-wrap:anywhere}" +
      ".skgp-cart-controls{display:flex;flex-wrap:wrap;align-items:center;gap:12px}" +
      ".skgp-qty{display:inline-flex;align-items:center;border:1px solid var(--skgp-silver);border-radius:999px;overflow:hidden}" +
      ".skgp-qty button{width:38px;height:38px;border:0;background:transparent;color:var(--skgp-white);font-size:1.1rem;cursor:pointer}.skgp-qty button[disabled]{opacity:.4;cursor:not-allowed}" +
      ".skgp-qty span{min-width:34px;text-align:center;color:var(--skgp-white);font-weight:700}" +
      ".skgp-link-btn{background:none;border:0;padding:0;color:var(--skgp-silver-soft);text-decoration:underline;cursor:pointer;font-family:inherit;font-size:.85rem}" +
      ".skgp-summary{padding:20px;border:1px solid var(--skgp-silver);border-radius:14px;background:var(--skgp-charcoal);color:var(--skgp-silver)}" +
      ".skgp-summary-line{display:flex;justify-content:space-between;gap:12px;align-items:baseline;color:var(--skgp-white);font-size:1.1rem;font-weight:700}" +
      ".skgp-summary p{font-size:.88rem;line-height:1.7;margin:12px 0 0}.skgp-summary .skgp-actions{margin-top:16px}" +
      ".skgp-toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,20px);max-width:calc(100% - 32px);padding:12px 20px;border-radius:999px;background:var(--skgp-white);color:var(--skgp-black);font-family:'Helvetica Neue',Arial,sans-serif;font-size:.88rem;font-weight:600;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;z-index:2000;text-align:center}" +
      ".skgp-toast.is-visible{opacity:1;transform:translate(-50%,0)}" +
      "@media (max-width:520px){.skgp-cart-row{grid-template-columns:68px 1fr}.skgp-cart-row img{width:68px;height:68px}.skgp-grid{grid-template-columns:1fr}}";

    var style = document.createElement("style");
    style.id = "skgp-app-styles";
    style.appendChild(document.createTextNode(css));
    var head = document.head || document.getElementsByTagName("head")[0];
    head.insertBefore(style, head.firstChild);
      }  /* ------------------------------------------------------------------ *
   * Shared header and footer
   * ------------------------------------------------------------------ */
  var NAV_LINKS = [
    { key: "index", href: "index.html", label: "Home" },
    { key: "shop", href: "shop.html", label: "Shop" },
    { key: "about", href: "about.html", label: "About" },
    { key: "contact", href: "contact.html", label: "Contact" },
    { key: "faq", href: "faq.html", label: "FAQ" }
  ];

  var POLICY_LINKS = [
    { href: "shipping.html", label: "Shipping" },
    { href: "returns.html", label: "Returns & Refunds" },
    { href: "privacy.html", label: "Privacy Policy" },
    { href: "terms.html", label: "Terms & Conditions" }
  ];

  function ensureMount(id, atStart) {
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      if (atStart) {
        document.body.insertBefore(el, document.body.firstChild);
      } else {
        document.body.appendChild(el);
      }
    }
    return el;
  }

  function mountHeader() {
    var mount = ensureMount("site-header", true);
    var activeKey = currentPage();
    if (activeKey === "product") {
      activeKey = "shop";
    }

    var links = NAV_LINKS.map(function (link) {
      var current = link.key === activeKey ? ' aria-current="page"' : "";
      return '<a href="' + siteUrl(link.href) + '"' + current + ">" + esc(link.label) + "</a>";
    }).join("");

    mount.innerHTML =
      '<header class="skgp-header">' +
      '<div class="skgp-header-inner">' +
      '<a class="skgp-logo" href="' + siteUrl("index.html") + '" aria-label="' + esc(STORE_NAME) + ' home">' + esc(STORE_NAME) + "</a>" +
      '<nav class="skgp-nav" id="skgp-nav" aria-label="Main navigation">' + links + "</nav>" +
      '<div class="skgp-header-actions">' +
      '<a class="skgp-cart-link" href="' + siteUrl("cart.html") + '" aria-label="Shopping cart">Cart <span class="skgp-badge" data-cart-count hidden>0</span></a>' +
      '<button type="button" class="skgp-menu-btn" data-action="toggle-menu" aria-controls="skgp-nav" aria-expanded="false" aria-label="Open menu"><span></span><span></span><span></span></button>' +
      "</div>" +
      "</div>" +
      "</header>";
  }

  function mountFooter() {
    var mount = ensureMount("site-footer", false);
    var year = new Date().getFullYear();

    var policyLinks = POLICY_LINKS.map(function (link) {
      return '<li><a href="' + siteUrl(link.href) + '">' + esc(link.label) + "</a></li>";
    }).join("");

    var shopLinks = NAV_LINKS.map(function (link) {
      return '<li><a href="' + siteUrl(link.href) + '">' + esc(link.label) + "</a></li>";
    }).join("");

    var contactItems = "";
    if (PHONE) {
      contactItems += '<li>Phone: <a href="tel:' + esc(PHONE) + '">' + esc(PHONE) + "</a></li>";
    }
    var wa = whatsappLink();
    if (wa) {
      contactItems += '<li>WhatsApp: <a href="' + esc(wa) + '" target="_blank" rel="noopener noreferrer">' + esc(WHATSAPP) + "</a></li>";
    }
    if (EMAIL) {
      contactItems += '<li>Email: <a href="mailto:' + esc(EMAIL) + '">' + esc(EMAIL) + "</a></li>";
    }

    mount.innerHTML =
      '<footer class="skgp-footer">' +
      '<div class="skgp-footer-inner">' +
      "<div><h4>" + esc(STORE_NAME) + "</h4>" +
      "<p>Premium phone accessories. Prices, shipping details and return conditions are confirmed before an order is placed.</p></div>" +
      "<div><h4>Store</h4><ul>" + shopLinks + '<li><a href="' + siteUrl("cart.html") + '">Cart</a></li></ul></div>' +
      "<div><h4>Information</h4><ul>" + policyLinks + "</ul></div>" +
      "<div><h4>Contact</h4><ul>" + (contactItems || '<li><a href="' + siteUrl("contact.html") + '">Contact page</a></li>') + "</ul></div>" +
      "</div>" +
      '<div class="skgp-footer-bottom">&copy; ' + year + " " + esc(STORE_NAME) + ". All rights reserved." +
      " No payment details are collected on this website.</div>" +
      "</footer>";
  }

  function setMenu(open) {
    var nav = $("#skgp-nav");
    var btn = $(".skgp-menu-btn");
    if (!nav || !btn) {
      return;
    }
    nav.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  function menuIsOpen() {
    var nav = $("#skgp-nav");
    return !!(nav && nav.classList.contains("is-open"));
  }

  /* ------------------------------------------------------------------ *
   * Product cards and messages
   * ------------------------------------------------------------------ */
  function priceHtml(product) {
    if (!hasPrice(product)) {
      return '<span class="skgp-price-main">Price to be confirmed</span>';
    }
    var html = '<span class="skgp-price-main">' + esc(money(product.price, product.currency)) + "</span>";
    if (product.priceConfirmed === false) {
      html += '<span class="skgp-price-note">' + esc(product.priceNote ? truncate(product.priceNote, 90) : "Demo price - unconfirmed") + "</span>";
    }
    return html;
  }

  function productCard(product) {
    var images = productImages(product);
    var img = images[0] || PLACEHOLDER_IMG;
    var available = isAvailable(product);

    var addBtn = available
      ? '<button type="button" class="skgp-btn skgp-btn-primary" data-action="add-to-cart" data-id="' + esc(product.id) + '">Add to cart</button>'
      : '<span class="skgp-unavailable">Currently unavailable</span>';

    var waBtn = available ? whatsappButton(productOrderMessage(product, 1), "Order on WhatsApp") : "";

    return (
      '<article class="skgp-card">' +
      '<a class="skgp-card-media" href="' + productUrl(product) + '" aria-label="View ' + esc(product.name) + '">' +
      '<img src="' + esc(img) + '" alt="' + esc(product.name) + '" loading="lazy" data-skgp-img>' +
      "</a>" +
      '<div class="skgp-card-body">' +
      (product.category ? '<span class="skgp-tag">' + esc(product.category) + "</span>" : "") +
      '<h3><a href="' + productUrl(product) + '">' + esc(product.name) + "</a></h3>" +
      (product.description ? '<p class="skgp-desc">' + esc(truncate(product.description, 140)) + "</p>" : "") +
      '<div class="skgp-price">' + priceHtml(product) + "</div>" +
      '<div class="skgp-actions">' + addBtn + waBtn + "</div>" +
      "</div>" +
      "</article>"
    );
  }

  function messageBox(title, text, buttonHtml, hint) {
    return (
      '<div class="skgp-empty" role="status">' +
      "<h3>" + esc(title) + "</h3>" +
      "<p>" + esc(text) + "</p>" +
      (buttonHtml || "") +
      (hint ? "<small>" + esc(hint) + "</small>" : "") +
      "</div>"
    );
  }

  function contactButton() {
    return '<a class="skgp-btn skgp-btn-outline" href="' + siteUrl("contact.html") + '">Contact us</a>';
  }

  function dataProblemHtml() {
    if (PRODUCTS_STATUS === "missing") {
      return messageBox(
        "Products could not be loaded",
        "Our product list is not available right now. Please refresh the page or contact us and we will help you.",
        contactButton(),
        "Site owner: js/products.js must define window.products and load before js/app.js."
      );
    }
    return messageBox(
      "No products available yet",
      "Our products will appear here soon. Please contact us if you have any questions.",
      contactButton(),
      ""
    );
  }

  function renderGrid(container, list, emptyHtml) {
    if (!container) {
      return;
    }
    if (!list.length) {
      container.innerHTML = emptyHtml;
      return;
    }
    container.innerHTML = '<div class="skgp-grid">' + list.map(productCard).join("") + "</div>";
  }

  /* ------------------------------------------------------------------ *
   * Home: featured products + categories
   * ------------------------------------------------------------------ */
  function renderFeatured() {
    var container = document.getElementById("featured-products");
    if (!container) {
      return;
    }
    if (PRODUCTS_STATUS !== "ok") {
      container.innerHTML = dataProblemHtml();
      return;
    }
    var featured = PRODUCTS.filter(function (p) {
      return p.featured === true;
    });
    renderGrid(
      container,
      featured,
      messageBox(
        "No featured products right now",
        "Please visit the shop to see everything we offer.",
        '<a class="skgp-btn skgp-btn-outline" href="' + siteUrl("shop.html") + '">Go to shop</a>',
        ""
      )
    );
  }

  function renderCategoryList() {
    var container = document.getElementById("category-list");
    if (!container) {
      return;
    }
    var cats = categories();
    if (!cats.length) {
      container.innerHTML = messageBox("No categories yet", "Product categories will appear here once products are added.", "", "");
      return;
    }
    container.innerHTML =
      '<div class="skgp-chips">' +
      '<a class="skgp-chip" href="' + siteUrl("shop.html") + '">All products</a>' +
      cats
        .map(function (c) {
          return '<a class="skgp-chip" href="' + siteUrl("shop.html?category=" + encodeURIComponent(c)) + '">' + esc(c) + "</a>";
        })
        .join("") +
      "</div>";
  }

  /* ------------------------------------------------------------------ *
   * Shop: search, category filter and sorting
   * ------------------------------------------------------------------ */
  var SHOP_IDS = {
    grid: ["product-grid", "products-grid", "productGrid", "products"],
    search: ["product-search", "search-input", "search", "productSearch"],
    category: ["category-filter", "category-select", "category", "categoryFilter"],
    sort: ["product-sort", "sort-select", "sort", "sort-products", "productSort"],
    count: ["results-count"],
    buttons: ["category-buttons"]
  };

  var shopState = { q: "", category: "", sort: "default" };
  var shopBound = false;

  // Converts any common sort option value into one of:
  // default | name-asc | name-desc | price-asc | price-desc
  function normalizeSort(value) {
    var v = String(value || "").toLowerCase();
    if (!v || v === "default" || v === "featured" || v === "relevance") {
      return "default";
    }
    var low = v.indexOf("low");
    var high = v.indexOf("high");
    var priceLike = v.indexOf("price") !== -1 || low !== -1 || high !== -1;
    if (priceLike) {
      if (v.indexOf("desc") !== -1) {
        return "price-desc";
      }
      if (high !== -1 && (low === -1 || high < low)) {
        return "price-desc";
      }
      return "price-asc";
    }
    if (v.indexOf("z-a") !== -1 || v.indexOf("za") !== -1 || v.indexOf("desc") !== -1) {
      return "name-desc";
    }
    if (v.indexOf("name") !== -1 || v.indexOf("a-z") !== -1 || v.indexOf("az") !== -1 || v.indexOf("asc") !== -1) {
      return "name-asc";
    }
    return "default";
  }

  function comparePrice(a, b, direction) {
    var pa = hasPrice(a.item) ? Number(a.item.price) : null;
    var pb = hasPrice(b.item) ? Number(b.item.price) : null;
    if (pa === null && pb === null) {
      return a.index - b.index;
    }
    if (pa === null) {
      return 1;
    }
    if (pb === null) {
      return -1;
    }
    if (pa === pb) {
      return a.index - b.index;
    }
    return direction === "asc" ? pa - pb : pb - pa;
  }

  function sortProducts(list, mode) {
    var wrapped = list.map(function (item, index) {
      return { item: item, index: index };
    });
    wrapped.sort(function (a, b) {
      switch (mode) {
        case "name-asc":
          return String(a.item.name).toLowerCase().localeCompare(String(b.item.name).toLowerCase()) || a.index - b.index;
        case "name-desc":
          return String(b.item.name).toLowerCase().localeCompare(String(a.item.name).toLowerCase()) || a.index - b.index;
        case "price-asc":
          return comparePrice(a, b, "asc");
        case "price-desc":
          return comparePrice(a, b, "desc");
        default:
          return a.index - b.index;
      }
    });
    return wrapped.map(function (w) {
      return w.item;
    });
  }

  function filteredProducts() {
    var q = shopState.q.trim().toLowerCase();
    var list = PRODUCTS.filter(function (p) {
      if (shopState.category && String(p.category || "").trim() !== shopState.category) {
        return false;
      }
      if (!q) {
        return true;
      }
      var haystack = [p.name, p.description, p.category].join(" ").toLowerCase();
      return haystack.indexOf(q) !== -1;
    });
    return sortProducts(list, shopState.sort);
  }

  function syncShopUrl() {
    if (!window.history || !window.history.replaceState) {
      return;
    }
    var params = [];
    if (shopState.q) {
      params.push("q=" + encodeURIComponent(shopState.q));
    }
    if (shopState.category) {
      params.push("category=" + encodeURIComponent(shopState.category));
    }
    if (shopState.sort !== "default") {
      params.push("sort=" + encodeURIComponent(shopState.sort));
    }
    try {
      window.history.replaceState(null, "", window.location.pathname + (params.length ? "?" + params.join("&") : ""));
    } catch (err) {
      /* ignore */
    }
  }

  function setSortControl(select) {
    if (!select || select.tagName !== "SELECT") {
      return;
    }
    for (var i = 0; i < select.options.length; i++) {
      if (normalizeSort(select.options[i].value) === shopState.sort) {
        select.selectedIndex = i;
        return;
      }
    }
  }

  function renderShopResults() {
    var grid = pick(SHOP_IDS.grid);
    if (!grid) {
      return;
    }

    if (PRODUCTS_STATUS !== "ok") {
      grid.innerHTML = dataProblemHtml();
      var emptyCount = pick(SHOP_IDS.count);
      if (emptyCount) {
        emptyCount.textContent = "";
      }
      return;
    }

    var list = filteredProducts();
    var filtering = !!(shopState.q || shopState.category);

    renderGrid(
      grid,
      list,
      messageBox(
        "No matching products",
        filtering
          ? "We could not find any products matching your search. Try different words or clear the filters."
          : "There are no products to show right now.",
        filtering ? '<button type="button" class="skgp-btn skgp-btn-outline" data-action="reset-filters">Clear search and filters</button>' : contactButton(),
        ""
      )
    );

    var count = pick(SHOP_IDS.count);
    if (count) {
      count.textContent = list.length === 1 ? "1 product" : list.length + " products";
    }

    var buttons = pick(SHOP_IDS.buttons);
    if (buttons) {
      $all("[data-category]", buttons).forEach(function (btn) {
        btn.classList.toggle("is-active", (btn.getAttribute("data-category") || "") === shopState.category);
      });
    }

    var select = pick(SHOP_IDS.category);
    if (select && select.tagName === "SELECT" && select.value !== shopState.category) {
      select.value = shopState.category;
    }
  }

  function renderShop() {
    var grid = pick(SHOP_IDS.grid);
    if (!grid) {
      return;
    }

    var params = getQuery();
    var cats = categories();
    var wantedCategory = params.get("category") || "";
    shopState.category = cats.indexOf(wantedCategory) !== -1 ? wantedCategory : "";
    shopState.q = params.get("q") || "";
    shopState.sort = normalizeSort(params.get("sort"));

    var search = pick(SHOP_IDS.search);
    if (search) {
      search.value = shopState.q;
    }

    var select = pick(SHOP_IDS.category);
    if (select && select.tagName === "SELECT") {
      select.innerHTML =
        '<option value="">All categories</option>' +
        cats
          .map(function (c) {
            return '<option value="' + esc(c) + '">' + esc(c) + "</option>";
          })
          .join("");
      select.value = shopState.category;
    }

    var buttons = pick(SHOP_IDS.buttons);
    if (buttons) {
      buttons.innerHTML = cats.length
        ? '<div class="skgp-chips">' +
          '<button type="button" class="skgp-chip" data-action="filter-category" data-category="">All</button>' +
          cats
            .map(function (c) {
              return '<button type="button" class="skgp-chip" data-action="filter-category" data-category="' + esc(c) + '">' + esc(c) + "</button>";
            })
            .join("") +
          "</div>"
        : "";
    }

    setSortControl(pick(SHOP_IDS.sort));
    renderShopResults();
  }

  function bindShopControls() {
    if (shopBound) {
      return;
    }
    var grid = pick(SHOP_IDS.grid);
    if (!grid) {
      return;
    }
    shopBound = true;

    var search = pick(SHOP_IDS.search);
    if (search) {
      var timer = null;
      var onSearch = function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          shopState.q = search.value || "";
          syncShopUrl();
          renderShopResults();
        }, 120);
      };
      search.addEventListener("input", onSearch);
      search.addEventListener("search", onSearch);
      var form = search.closest ? search.closest("form") : null;
      if (form) {
        form.addEventListener("submit", function (e) {
          e.preventDefault();
        });
      }
    }

    var category = pick(SHOP_IDS.category);
    if (category && category.tagName === "SELECT") {
      category.addEventListener("change", function () {
        shopState.category = category.value || "";
        syncShopUrl();
        renderShopResults();
      });
    }

    var sort = pick(SHOP_IDS.sort);
    if (sort && sort.tagName === "SELECT") {
      sort.addEventListener("change", function () {
        shopState.sort = normalizeSort(sort.value);
        syncShopUrl();
        renderShopResults();
      });
    }
      }  /* ------------------------------------------------------------------ *
   * Product details page
   * ------------------------------------------------------------------ */
  function renderProductDetail() {
    var container = document.getElementById("product-detail");
    if (!container) {
      return;
    }
    // Leave the container alone if another script has already filled it.
    if (container.children.length && !container.hasAttribute("data-app-rendered")) {
      return;
    }
    container.setAttribute("data-app-rendered", "1");

    if (PRODUCTS_STATUS !== "ok") {
      container.innerHTML = dataProblemHtml();
      return;
    }

    var id = getQuery().get("id");
    var product = id ? getProduct(id) : null;

    if (!product) {
      container.innerHTML = messageBox(
        "Product not found",
        "We could not find this product. It may no longer be available.",
        '<a class="skgp-btn skgp-btn-outline" href="' + siteUrl("shop.html") + '">Back to shop</a>',
        ""
      );
      return;
    }

    document.title = product.name + " | " + STORE_NAME;

    var images = productImages(product);
    var mainImg = images[0] || PLACEHOLDER_IMG;
    var thumbs = "";
    if (images.length > 1) {
      thumbs =
        '<div class="skgp-thumbs">' +
        images
          .map(function (src, i) {
            return (
              '<button type="button" class="skgp-thumb' + (i === 0 ? " is-active" : "") + '" data-action="gallery" data-src="' + esc(src) +
              '" aria-label="Show image ' + (i + 1) + '"><img src="' + esc(src) + '" alt="" loading="lazy" data-skgp-img></button>'
            );
          })
          .join("") +
        "</div>";
    }

    var available = isAvailable(product);
    var addBtn = available
      ? '<button type="button" class="skgp-btn skgp-btn-primary" data-action="add-to-cart" data-id="' + esc(product.id) + '">Add to cart</button>'
      : '<span class="skgp-unavailable">Currently unavailable</span>';
    var waBtn = available ? whatsappButton(productOrderMessage(product, 1), "Order on WhatsApp") : "";

    container.innerHTML =
      '<div class="skgp-detail">' +
      "<div>" +
      '<div class="skgp-gallery-main"><img id="skgp-gallery-main-img" src="' + esc(mainImg) + '" alt="' + esc(product.name) + '" data-skgp-img></div>' +
      thumbs +
      "</div>" +
      "<div>" +
      (product.category ? '<span class="skgp-tag">' + esc(product.category) + "</span>" : "") +
      "<h1>" + esc(product.name) + "</h1>" +
      '<div class="skgp-price">' + priceHtml(product) + "</div>" +
      (product.description ? "<p>" + esc(product.description) + "</p>" : "") +
      '<div class="skgp-actions">' + addBtn + waBtn + "</div>" +
      '<div class="skgp-note">Prices, shipping details and return conditions will be confirmed before your order is placed. ' +
      "No payment is taken on this website.</div>" +
      "</div>" +
      "</div>";
  }

  /* ------------------------------------------------------------------ *
   * Cart page
   * ------------------------------------------------------------------ */
  function renderCart() {
    var itemsEl = document.getElementById("cart-items");
    var summaryEl = document.getElementById("cart-summary");
    if (!itemsEl && !summaryEl) {
      return;
    }

    var rows = cartRows();

    if (!rows.length) {
      if (itemsEl) {
        itemsEl.innerHTML = messageBox(
          "Your cart is empty",
          PRODUCTS_STATUS === "ok" ? "Browse our shop and add a product to get started." : "Your cart is empty right now.",
          '<a class="skgp-btn skgp-btn-outline" href="' + siteUrl("shop.html") + '">Go to shop</a>',
          ""
        );
      }
      if (summaryEl) {
        summaryEl.innerHTML = "";
      }
      return;
    }

    var itemsHtml = rows
      .map(function (row) {
        var p = row.product;
        var img = productImages(p)[0] || PLACEHOLDER_IMG;
        var available = isAvailable(p);
        var lineTotal =
          available && hasPrice(p) ? '<strong style="color:#fff">' + esc(money(Number(p.price) * row.qty, p.currency)) + "</strong>" : "";
        return (
          '<div class="skgp-cart-row">' +
          '<a href="' + productUrl(p) + '"><img src="' + esc(img) + '" alt="' + esc(p.name) + '" loading="lazy" data-skgp-img></a>' +
          '<div class="skgp-cart-info">' +
          '<a href="' + productUrl(p) + '">' + esc(p.name) + "</a>" +
          '<div class="skgp-price">' + priceHtml(p) + "</div>" +
          (available ? "" : '<span class="skgp-unavailable">Currently unavailable - please remove this item</span>') +
          '<div class="skgp-cart-controls">' +
          '<div class="skgp-qty">' +
          '<button type="button" data-action="qty-dec" data-id="' + esc(p.id) + '" aria-label="Decrease quantity of ' + esc(p.name) + '">&minus;</button>' +
          '<span aria-live="polite">' + row.qty + "</span>" +
          '<button type="button" data-action="qty-inc" data-id="' + esc(p.id) + '" aria-label="Increase quantity of ' + esc(p.name) + '"' + (row.qty >= MAX_QTY ? " disabled" : "") + ">+</button>" +
          "</div>" +
          lineTotal +
          '<button type="button" class="skgp-link-btn" data-action="remove-item" data-id="' + esc(p.id) + '">Remove</button>' +
          "</div>" +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    var orderable = rows.filter(function (row) {
      return isAvailable(row.product);
    });
    var totals = cartTotals(rows);

    var totalLine = "";
    if (totals.hasAnyPrice) {
      totalLine =
        '<div class="skgp-summary-line"><span>Estimated total</span><span>' + esc(money(totals.total)) + "</span></div>" +
        "<p>" +
        (totals.unconfirmed ? "This total includes demonstration prices that are not confirmed. " : "") +
        (totals.missingPrice ? "Some items have prices that are still to be confirmed. " : "") +
        "The final total, including any shipping costs, will be confirmed before you place your order.</p>";
    } else {
      totalLine = "<p>Prices will be confirmed before you place your order.</p>";
    }

    var orderBtn = orderable.length ? whatsappButton(cartOrderMessage(orderable, totals), "Send order via WhatsApp", "") : "";

    var summaryHtml =
      '<div class="skgp-summary">' +
      totalLine +
      "<p><strong>Payment:</strong> Online card payment is not available on this website yet. " +
      "No payment is taken here and we never ask for card or bank details on this site. " +
      "Send your order by WhatsApp and we will confirm the final price, shipping details and payment options with you.</p>" +
      '<div class="skgp-actions">' +
      orderBtn +
      '<button type="button" class="skgp-btn skgp-btn-outline" data-action="clear-cart">Clear cart</button>' +
      "</div>" +
      "</div>";

    if (itemsEl && summaryEl) {
      itemsEl.innerHTML = '<div class="skgp-cart">' + itemsHtml + "</div>";
      summaryEl.innerHTML = summaryHtml;
    } else if (itemsEl) {
      itemsEl.innerHTML = '<div class="skgp-cart">' + itemsHtml + summaryHtml + "</div>";
    } else {
      summaryEl.innerHTML = summaryHtml;
    }
  }

  /* ------------------------------------------------------------------ *
   * Contact page + auto-filled text hooks
   * ------------------------------------------------------------------ */
  function renderContact() {
    var container = document.getElementById("contact-details");
    if (!container) {
      return;
    }
    var cards = "";
    if (PHONE) {
      cards += '<div class="skgp-card"><div class="skgp-card-body"><span class="skgp-tag">Phone</span><h3><a href="tel:' + esc(PHONE) + '">' + esc(PHONE) + "</a></h3></div></div>";
    }
    var wa = whatsappLink("Hello " + STORE_NAME + ", I have a question.");
    if (wa) {
      cards += '<div class="skgp-card"><div class="skgp-card-body"><span class="skgp-tag">WhatsApp</span><h3><a href="' + esc(wa) + '" target="_blank" rel="noopener noreferrer">' + esc(WHATSAPP) + "</a></h3></div></div>";
    }
    if (EMAIL) {
      cards += '<div class="skgp-card"><div class="skgp-card-body"><span class="skgp-tag">Email</span><h3><a href="mailto:' + esc(EMAIL) + '" style="overflow-wrap:anywhere">' + esc(EMAIL) + "</a></h3></div></div>";
    }
    container.innerHTML = cards
      ? '<div class="skgp-grid">' + cards + "</div>"
      : messageBox("Contact details unavailable", "Contact details have not been configured yet.", "", "");
  }

  function fillTextHooks() {
    $all("[data-store-name]").forEach(function (el) {
      el.textContent = STORE_NAME;
    });
    $all("[data-store-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
    $all("[data-store-phone]").forEach(function (el) {
      el.textContent = PHONE;
      if (el.tagName === "A" && PHONE) {
        el.setAttribute("href", "tel:" + PHONE);
      }
    });
    $all("[data-store-email]").forEach(function (el) {
      el.textContent = EMAIL;
      if (el.tagName === "A" && EMAIL) {
        el.setAttribute("href", "mailto:" + EMAIL);
      }
    });
    $all("[data-store-whatsapp]").forEach(function (el) {
      var link = whatsappLink();
      if (link && el.tagName === "A") {
        el.setAttribute("href", link);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
      if (!el.textContent.trim() && WHATSAPP) {
        el.textContent = WHATSAPP;
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Simple FAQ accordion (only when .faq-item markup exists)
   * ------------------------------------------------------------------ */
  function initFaq() {
    $all(".faq-item").forEach(function (item) {
      var question = $(".faq-question", item);
      var answer = $(".faq-answer", item);
      if (!question || !answer) {
        return;
      }
      question.setAttribute("aria-expanded", "false");
      question.setAttribute("role", "button");
      if (!question.hasAttribute("tabindex")) {
        question.setAttribute("tabindex", "0");
      }
      answer.hidden = true;
    });
  }

  function toggleFaq(question) {
    var item = question.closest(".faq-item");
    var answer = item ? $(".faq-answer", item) : null;
    if (!item || !answer) {
      return;
    }
    var open = answer.hidden;
    answer.hidden = !open;
    item.classList.toggle("is-open", open);
    question.setAttribute("aria-expanded", open ? "true" : "false");
  }

  /* ------------------------------------------------------------------ *
   * Events
   * ------------------------------------------------------------------ */
  function onClick(event) {
    var target = event.target;
    if (!target || !target.closest) {
      return;
    }

    var faqQuestion = target.closest(".faq-question");
    if (faqQuestion) {
      toggleFaq(faqQuestion);
      return;
    }

    var actionEl = target.closest("[data-action]");
    if (!actionEl) {
      if (menuIsOpen() && !target.closest(".skgp-header")) {
        setMenu(false);
      }
      return;
    }

    var action = actionEl.getAttribute("data-action");
    var id = actionEl.getAttribute("data-id");

    switch (action) {
      case "toggle-menu":
        setMenu(!menuIsOpen());
        break;
      case "add-to-cart":
        addToCart(id, 1);
        break;
      case "qty-inc":
        changeQty(id, 1);
        break;
      case "qty-dec":
        changeQty(id, -1);
        break;
      case "remove-item":
        removeFromCart(id);
        break;
      case "clear-cart":
        clearCart();
        break;
      case "filter-category":
        shopState.category = actionEl.getAttribute("data-category") || "";
        syncShopUrl();
        renderShopResults();
        break;
      case "reset-filters":
        shopState.q = "";
        shopState.category = "";
        var search = pick(SHOP_IDS.search);
        if (search) {
          search.value = "";
        }
        syncShopUrl();
        renderShopResults();
        break;
      case "gallery":
        var mainImg = document.getElementById("skgp-gallery-main-img");
        if (mainImg && actionEl.getAttribute("data-src")) {
          mainImg.src = actionEl.getAttribute("data-src");
          $all(".skgp-thumb").forEach(function (t) {
            t.classList.toggle("is-active", t === actionEl);
          });
        }
        break;
      default:
        break;
    }
  }

  function onKeydown(event) {
    if (event.key === "Escape" && menuIsOpen()) {
      setMenu(false);
      var btn = $(".skgp-menu-btn");
      if (btn) {
        btn.focus();
      }
      return;
    }
    if (
      (event.key === "Enter" || event.key === " ") &&
      event.target &&
      event.target.classList &&
      event.target.classList.contains("faq-question") &&
      event.target.tagName !== "BUTTON"
    ) {
      event.preventDefault();
      toggleFaq(event.target);
    }
  }

  function onImageError(event) {
    var img = event.target;
    if (
      img &&
      img.tagName === "IMG" &&
      img.hasAttribute("data-skgp-img") &&
      img.src !== PLACEHOLDER_IMG &&
      !img.getAttribute("data-fallback")
    ) {
      img.setAttribute("data-fallback", "1");
      img.src = PLACEHOLDER_IMG;
    }
  }

  function bindGlobalEvents() {
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeydown);
    document.addEventListener("error", onImageError, true);

    window.addEventListener("storage", function (e) {
      if (e.key === CART_KEY) {
        refreshCartUI();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 860 && menuIsOpen()) {
        setMenu(false);
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Init
   * ------------------------------------------------------------------ */
  function renderProductPages() {
    safe(renderFeatured);
    safe(renderCategoryList);
    safe(renderShop);
    safe(bindShopControls);
    safe(renderProductDetail);
    safe(renderCart);
    safe(updateCartBadge);
  }

  function init() {
    loadProducts();

    safe(injectStyles);
    safe(mountHeader);
    safe(mountFooter);
    safe(bindGlobalEvents);
    safe(fillTextHooks);
    renderProductPages();
    safe(renderContact);
    safe(initFaq);

    if (PRODUCTS_STATUS === "missing" && window.console && console.error) {
      console.error("[SK GRIP PRO] window.products was not found. Make sure js/products.js loads before js/app.js and defines window.products.");
    }

    // If the product data arrived late, try once more after the page has fully loaded.
    window.addEventListener("load", function () {
      if (PRODUCTS_STATUS !== "ok") {
        loadProducts();
        if (PRODUCTS_STATUS === "ok") {
          renderProductPages();
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window, document);
