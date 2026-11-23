```javascript
/**
 * SK GRIP PRO - Main Application Script
 * File: js/app.js
 *
 * Load order on every page:
 *   1. js/config.js    -> window.STORE_CONFIG
 *   2. js/products.js  -> window.products
 *   3. js/app.js       -> this file
 *
 * What this file does:
 *  - Builds the shared header and footer (into #site-header and #site-footer)
 *  - Provides a mobile navigation menu
 *  - Renders featured products, categories, shop (search + category filter),
 *    product details, and the shopping cart
 *  - Stores the cart in localStorage (product ids and quantities only)
 *  - Creates WhatsApp order links using the configured WhatsApp number
 *
 * Optional page hooks (every one is optional - missing elements are skipped):
 *   #featured-products   Featured products grid (usually on index.html)
 *   #category-list       Category links (usually on index.html)
 *   #product-grid        Product grid (shop.html)
 *   #product-search      Search input (shop.html)
 *   #category-filter     Category <select> (shop.html)
 *   #category-buttons    Category filter buttons (shop.html)
 *   #results-count       Text showing number of results (shop.html)
 *   #product-detail      Product details (product.html?id=PRODUCT_ID)
 *   #cart-items          Cart items (cart.html)
 *   #cart-summary        Cart summary (cart.html)
 *   #contact-details     Contact cards (contact.html)
 *   .faq-item > .faq-question + .faq-answer   Simple FAQ accordion (faq.html)
 *   [data-store-name] [data-store-phone] [data-store-email]
 *   [data-store-whatsapp] [data-store-year]   Auto-filled text/links
 *
 * Payments: no payment is processed here. No card or bank details are
 * collected or stored. Orders are sent by WhatsApp and confirmed manually.
 */
(function (window, document) {
  "use strict";

  /* ------------------------------------------------------------------ *
   * Settings (read from window.STORE_CONFIG, with safe fallbacks)
   * ------------------------------------------------------------------ */
  var CFG = window.STORE_CONFIG || {};
  var CFG_STORE = CFG.store || {};
  var CFG_CURRENCY = CFG.currency || {};
  var CFG_CONTACT = CFG.contact || {};
  var CFG_WEBSITE = CFG.website || {};

  var STORE_NAME = CFG_STORE.name || "SK GRIP PRO";
  var CURRENCY = CFG_CURRENCY.code || "USD";
  var LOCALE = CFG_CURRENCY.locale || "en-US";
  var PHONE = CFG_CONTACT.phone || "";
  var WHATSAPP = CFG_CONTACT.whatsapp || "";
  var EMAIL = CFG_CONTACT.email || "";
  var SITE_URL = CFG_WEBSITE.url || "";

  var CART_KEY = "skgrippro_cart_v1";
  var MAX_QTY = 99;

  var PRODUCTS = [];
  try {
    if (Array.isArray(window.products)) {
      PRODUCTS = window.products.filter(function (p) {
        return p && typeof p === "object" && p.id !== undefined && p.name;
      });
    }
  } catch (err) {
    PRODUCTS = [];
  }

  /* ------------------------------------------------------------------ *
   * Small helpers
   * ------------------------------------------------------------------ */
  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
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
    var code = currency || CURRENCY;
    try {
      return new Intl.NumberFormat(LOCALE, { style: "currency", currency: code }).format(value);
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
    return "product.html?id=" + encodeURIComponent(product.id);
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
    return list;
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
      return '<a class="' + cls + '" href="contact.html">Contact us</a>';
    }
    return (
      '<a class="' + cls + '" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' +
      esc(label || "Order on WhatsApp") +
      "</a>"
    );
  }

  /* ------------------------------------------------------------------ *
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
      /* Storage unavailable (private mode, blocked). Cart lives in memory only. */
    }
  }

  function cartRows() {
    var rows = [];
    var cleaned = [];
    readCart().forEach(function (item) {
      var product = getProduct(item.id);
      if (product) {
        rows.push({ product: product, qty: item.qty });
        cleaned.push(item);
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
    var items = readCart();
    items = items
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
   * Styles for generated components (css/style.css can override these)
   * ------------------------------------------------------------------ */
  function injectStyles() {
    if ($("#skgp-app-styles")) {
      return;
    }
    var css =
      ":root{--skgp-black:#0a0a0a;--skgp-charcoal:#151515;--skgp-graphite:#1f1f21;--skgp-silver:#c9ccd1;--skgp-silver-soft:#9ea2a9;--skgp-white:#fff;--skgp-line:rgba(201,204,209,.18)}" +
      ".skgp-header,.skgp-footer,.skgp-card,.skgp-cart,.skgp-detail,.skgp-empty{font-family:'Helvetica Neue',Arial,sans-serif;box-sizing:border-box}" +
      ".skgp-header *,.skgp-footer *,.skgp-card *,.skgp-cart *,.skgp-detail *,.skgp-empty *{box-sizing:border-box}" +
      ".skgp-header{position:sticky;top:0;z-index:1000;background:rgba(10,10,10,.96);border-bottom:1px solid var(--skgp-line);backdrop-filter:blur(8px)}" +
      ".skgp-header-inner{max-width:1200px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px}" +
      ".skgp-logo{color:var(--skgp-white);font-weight:800;letter-spacing:.18em;text-transform:uppercase;text-decoration:none;font-size:1.05rem;white-space:nowrap}" +
      ".skgp-nav{display:flex;align-items:center;gap:6px}" +
      ".skgp-nav a{color:var(--skgp-silver);text-decoration:none;padding:8px 12px;border-radius:999px;font-size:.88rem;letter-spacing:.06em;text-transform:uppercase;transition:color .2s,background .2s}" +
      ".skgp-nav a:hover,.skgp-nav a:focus-visible,.skgp-nav a[aria-current='page']{color:var(--skgp-white);background:rgba(201,204,209,.12)}" +
      ".skgp-header-actions{display:flex;align-items:center;gap:10px}" +
      ".skgp-cart-link{position:relative;display:inline-flex;align-items:center;gap:8px;color:var(--skgp-white);text-decoration:none;padding:8px 14px;border:1px solid var(--skgp-silver);border-radius:999px;font-size:.85rem;letter-spacing:.06em;text-transform:uppercase}" +
      ".skgp-cart-link:hover,.skgp-cart-link:focus-visible{background:rgba(201,204,209,.12)}" +
      ".skgp-badge{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:var(--skgp-white);color:var(--skgp-black);font-size:.75rem;font-weight:700}" +
      ".skgp-badge[hidden]{display:none}" +
      ".skgp-menu-btn{display:none;width:44px;height:44px;border:1px solid var(--skgp-silver);border-radius:10px;background:transparent;color:var(--skgp-white);cursor:pointer;padding:0;align-items:center;justify-content:center;flex-direction:column;gap:5px}" +
      ".skgp-menu-btn span{display:block;width:20px;height:2px;background:currentColor;transition:transform .2s,opacity .2s}" +
      ".skgp-menu-btn[aria-expanded='true'] span:nth-child(1){transform:translateY(7px) rotate(45deg)}" +
      ".skgp-menu-btn[aria-expanded='true'] span:nth-child(2){opacity:0}" +
      ".skgp-menu-btn[aria-expanded='true'] span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}" +
      "@media (max-width:860px){.skgp-menu-btn{display:inline-flex}.skgp-nav{display:none;position:absolute;left:0;right:0;top:100%;flex-direction:column;align-items:stretch;gap:0;padding:10px 20px 18px;background:var(--skgp-black);border-bottom:1px solid var(--skgp-line)}.skgp-nav.is-open{display:flex}.skgp-nav a{padding:14px 12px;border-radius:8px}}" +
      ".skgp-footer{background:#080808;color:var(--skgp-silver);border-top:1px solid var(--skgp-line);margin-top:48px}" +
      ".skgp-footer-inner{max-width:1200px;margin:0 auto;padding:44px 20px 24px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:32px}" +
      ".skgp-footer h4{margin:0 0 14px;color:var(--skgp-white);font-size:.85rem;letter-spacing:.2em;text-transform:uppercase}" +
      ".skgp-footer p{margin:0 0 10px;line-height:1.7;font-size:.93rem}" +
      ".skgp-footer ul{list-style:none;margin:0;padding:0}.skgp-footer li{margin:0 0 8px}" +
      ".skgp-footer a{color:var(--skgp-silver);text-decoration:none;overflow-wrap:anywhere}.skgp-footer a:hover,.skgp-footer a:focus-visible{color:var(--skgp-white);text-decoration:underline}" +
      ".skgp-footer-bottom{max-width:1200px;margin:0 auto;padding:18px 20px 28px;border-top:1px solid var(--skgp-line);font-size:.82rem;color:var(--skgp-silver-soft);line-height:1.6}" +
      ".skgp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:20px}" +
      ".skgp-card{display:flex;flex-direction:column;border:1px solid var(--skgp-line);border-radius:14px;background:linear-gradient(160deg,var(--skgp-graphite),var(--skgp-charcoal));overflow:hidden;color:var(--skgp-silver);transition:border-color .25s,transform .25s}" +
      ".skgp-card:hover{border-color:var(--skgp-silver);transform:translateY(-2px)}" +
      ".skgp-card-media{display:block;aspect-ratio:1/1;background:#101010;overflow:hidden}" +
      ".skgp-card-media img{width:100%;height:100%;object-fit:cover;display:block}" +
      ".skgp-card-body{display:flex;flex-direction:column;gap:10px;padding:18px;flex:1}" +
      ".skgp-card h3{margin:0;font-size:1.05rem;line-height:1.35}.skgp-card h3 a{color:var(--skgp-white);text-decoration:none}" +
      ".skgp-tag{align-self:flex-start;font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:var(--skgp-silver-soft)}" +
      ".skgp-desc{margin:0;font-size:.92rem;line-height:1.6;color:var(--skgp-silver)}" +
      ".skgp-price{display:flex;flex-direction:column;gap:2px;margin-top:auto}" +
      ".skgp-price-main{color:var(--skgp-white);font-size:1.2rem;font-weight:700}" +
      ".skgp-price-note{font-size:.76rem;color:var(--skgp-silver-soft)}" +
      ".skgp-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}" +
      ".skgp-btn{display:inline-flex;align-items:center;justify-content:center;padding:11px 20px;border-radius:999px;border:1px solid transparent;font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;cursor:pointer;font-family:inherit;transition:opacity .2s,transform .2s,background .2s}" +
      ".skgp-btn:hover,.skgp-btn:focus-visible{opacity:.88;transform:translateY(-1px)}" +
      ".skgp-btn-primary{background:linear-gradient(180deg,#fff,#b9bcc2);color:var(--skgp-black)}" +
      ".skgp-btn-outline{background:transparent;color:var(--skgp-white);border-color:var(--skgp-silver)}" +
      ".skgp-btn[disabled]{opacity:.45;cursor:not-allowed;transform:none}" +
      ".skgp-unavailable{display:inline-block;padding:6px 12px;border:1px solid var(--skgp-line);border-radius:999px;font-size:.75rem;letter-spacing:.1em;text-transform:uppercase;color:var(--skgp-silver-soft)}" +
      ".skgp-chips{display:flex;flex-wrap:wrap;gap:10px}" +
      ".skgp-chip{display:inline-block;padding:9px 18px;border:1px solid var(--skgp-line);border-radius:999px;background:transparent;color:var(--skgp-silver);font-size:.82rem;letter-spacing:.06em;text-decoration:none;cursor:pointer;font-family:inherit}" +
      ".skgp-chip:hover,.skgp-chip:focus-visible,.skgp-chip.is-active{border-color:var(--skgp-silver);color:var(--skgp-white);background:rgba(201,204,209,.1)}" +
      ".skgp-empty{padding:36px 22px;text-align:center;border:1px dashed var(--skgp-silver-soft);border-radius:14px;color:var(--skgp-silver);background:var(--skgp-charcoal);line-height:1.7}" +
      ".skgp
