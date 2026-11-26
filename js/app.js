/*!
 * SK GRIP PRO - js/app.js  (PART 1 of 3)
 * Core: settings, helpers, products, cart, notifications, WhatsApp order.
 * Needs: js/config.js (window.STORE_CONFIG) and js/products.js (window.products) loaded first.
 */
(function () {
  "use strict";

  // Stop duplicate event listeners if this file is ever loaded twice.
  if (window.__SKX_APP__) return;
  window.__SKX_APP__ = true;

  /* ---------- Settings from js/config.js ---------- */
  var CFG = window.STORE_CONFIG || {};
  var SOCIAL = CFG.social || {};
  var STORE = CFG.storeName || "SK GRIP PRO";
  var SYMBOL = CFG.currencySymbol || "$";
  var DEFAULT_IMG = CFG.defaultImage || "images/accessory.svg";
  var CART_KEY = "skgp_cart_v2";   // new key: never overwrites any old cart data

  /* ---------- Small helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function currentFile() {
    var f = location.pathname.split("/").pop().toLowerCase();
    return f || "index.html";
  }
  function pageName() {
    var b = document.body;
    return (b && b.getAttribute("data-page")) || "";
  }

  /* ---------- Products (window.products) ---------- */
  var PRODUCTS = [];

  /** Reads window.products and keeps only valid items, with safe default values. */
  function loadProducts() {
    var raw = window.products;
    if (!Array.isArray(raw)) { PRODUCTS = []; return; }
    PRODUCTS = raw.filter(function (p) { return p && p.id && p.name; }).map(function (p) {
      var price = (typeof p.price === "number" && isFinite(p.price)) ? p.price : null;
      var images = Array.isArray(p.images) && p.images.length ? p.images : (p.image ? [p.image] : []);
      return {
        id: String(p.id),
        name: String(p.name),
        price: price,
        priceConfirmed: p.priceConfirmed === true,
        priceNote: p.priceNote ? String(p.priceNote) : "",
        category: p.category ? String(p.category) : "",
        description: p.description ? String(p.description) : "",
        image: p.image ? String(p.image) : (images[0] || DEFAULT_IMG),
        images: images,
        featured: p.featured === true,
        available: p.available !== false
      };
    });
  }
  function findProduct(id) {
    for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === String(id)) return PRODUCTS[i];
    return null;
  }

  /** $29.99 style text. */
  function money(n) {
    return SYMBOL + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  /** Price block for cards and the product page (never hides that a price is unconfirmed). */
  function priceHTML(p) {
    if (p.price === null) return '<span class="skx-price pending">Price to be confirmed</span>';
    return '<span class="skx-price">' + esc(money(p.price)) + '</span>' +
      (!p.priceConfirmed && p.priceNote ? '<small class="skx-note">' + esc(p.priceNote) + '</small>' : '');
  }

  /* ---------- Notifications (toast) ---------- */
  var toastTimer;
  /** type: "success" or "error" */
  function notify(message, type) {
    var t = document.getElementById("skx-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "skx-toast";
      t.setAttribute("role", "status");
      t.setAttribute("aria-live", "polite");
      document.body.appendChild(t);
    }
    t.className = "skx-toast " + (type === "error" ? "error" : "ok") + " show";
    t.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  /* ---------- Cart (saved in localStorage as [{id, qty}]) ---------- */
  var memCart = [];          // used only if the browser blocks localStorage
  var storageOK = true;

  function readCart() {
    if (!storageOK) return memCart;
    var raw = null;
    try { raw = localStorage.getItem(CART_KEY); } catch (e) { storageOK = false; return memCart; }
    try {
      var v = JSON.parse(raw);
      return Array.isArray(v) ? v.filter(function (i) { return i && i.id && Number(i.qty) > 0; }) : [];
    } catch (e) { return []; }
  }
  function writeCart(items) {
    memCart = items;
    if (storageOK) {
      try { localStorage.setItem(CART_KEY, JSON.stringify(items)); }
      catch (e) { storageOK = false; notify("Could not save your cart on this device.", "error"); }
    }
    updateCount();
  }

  /** Cart rows joined with product data. Items whose product no longer exists are skipped. */
  function cartLines() {
    var out = [];
    readCart().forEach(function (it) {
      var p = findProduct(it.id);
      if (p) out.push({ p: p, qty: Math.min(99, Math.max(1, Math.floor(Number(it.qty)))) });
    });
    return out;
  }
  /** count = items, subtotal = sum of priced items, pending = lines with no price yet. */
  function cartTotals() {
    var t = { count: 0, subtotal: 0, pending: 0 };
    cartLines().forEach(function (l) {
      t.count += l.qty;
      if (l.p.price === null) t.pending += 1; else t.subtotal += l.p.price * l.qty;
    });
    return t;
  }

  function addToCart(id, qty) {
    qty = Math.max(1, Math.min(99, parseInt(qty, 10) || 1));
    var p = findProduct(id);
    if (!p) { notify("Sorry, this product could not be found.", "error"); return false; }
    if (!p.available) { notify(p.name + " is currently unavailable.", "error"); return false; }
    var items = readCart(), found = false;
    items.forEach(function (it) {
      if (String(it.id) === p.id) { it.qty = Math.min(99, Number(it.qty) + qty); found = true; }
    });
    if (!found) items.push({ id: p.id, qty: qty });
    writeCart(items);
    notify(p.name + " added to cart", "ok");
    return true;
  }
  function setQty(id, qty) {
    qty = Math.floor(Number(qty));
    if (!(qty >= 1)) return;
    var items = readCart();
    items.forEach(function (it) { if (String(it.id) === String(id)) it.qty = Math.min(99, qty); });
    writeCart(items);
  }
  function removeItem(id) {
    writeCart(readCart().filter(function (it) { return String(it.id) !== String(id); }));
    notify("Item removed from cart", "ok");
  }
  function clearCart() { writeCart([]); }

  /** Updates every cart counter and redraws the cart page if it is open. */
  function updateCount() {
    var n = cartTotals().count;
    $$(".skx-count, [data-cart-count]").forEach(function (el) {
      el.textContent = n;
      el.classList.toggle("zero", n === 0);
    });
    if (document.getElementById("cart-root")) renderCart();
  }

  /* ---------- WhatsApp ordering (number comes from config.js) ---------- */
  function openWhatsApp(text) {
    var number = String(CFG.whatsapp || "").replace(/\D/g, "");
    if (number.length < 8) { notify("WhatsApp number is not set in js/config.js.", "error"); return; }
    var url = "https://wa.me/" + number + "?text=" + encodeURIComponent(text);
    var w = null;
    try { w = window.open(url, "_blank", "noopener"); } catch (e) { /* ignore */ }
    if (!w) window.location.href = url;   // popup blocked: open in this tab
  }
  function lineText(l, i) {
    return (i + 1) + ". " + l.p.name + " x " + l.qty + " - " +
      (l.p.price === null ? "price to be confirmed" : money(l.p.price * l.qty));
  }
  var ORDER_NOTE = "Note: price, availability and shipping are confirmed before the order is final.";

  function orderCartWhatsApp() {
    var lines = cartLines();
    if (!lines.length) { notify("Your cart is empty.", "error"); return; }
    var t = cartTotals();
    var msg = [CFG.whatsappGreeting || "Hello, I would like to place an order:", ""];
    lines.forEach(function (l, i) { msg.push(lineText(l, i)); });
    msg.push("", "Total (priced items): " + money(t.subtotal));
    if (t.pending) msg.push(t.pending + " item(s) still need a price confirmation.");
    msg.push("", ORDER_NOTE);
    openWhatsApp(msg.join("\n"));
  }
  function orderProductWhatsApp(id, qty) {
    var p = findProduct(id);
    if (!p) { notify("Sorry, this product could not be found.", "error"); return; }
    qty = Math.max(1, Math.min(99, parseInt(qty, 10) || 1));
    openWhatsApp([CFG.whatsappGreeting || "Hello, I would like to place an order:", "",
      lineText({ p: p, qty: qty }, 0), "", ORDER_NOTE].join("\n"));
  }

  /* >>> PART 1 ENDS HERE. Paste PART 2 directly below this line. <<< */
