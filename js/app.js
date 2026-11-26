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

  /* >>> PART 1 ENDS HERE. Paste PART 2 directly below this line. <<< */  /* =====================================================================
     PART 2 of 3: styles, header, footer, product cards, shop page, home page
     ===================================================================== */

  /** All styles for the whole site live here (black + electric blue). */
  function injectStyles() {
    if (document.getElementById("skx-styles")) return;
    var css = `
:root{--bg:#000;--bg2:#080808;--card:#151515;--text:#fff;--muted:#bdbdbd;--blue:#168bff;--cyan:#7cc4ff;--line:rgba(255,255,255,.12)}
body.skx{margin:0;background:var(--bg);color:var(--text);font-family:Arial,Helvetica,sans-serif;line-height:1.55;-webkit-text-size-adjust:100%}
body.skx *{box-sizing:border-box}
body.skx a{color:inherit;text-decoration:none}
.skx-wrap{width:100%;max-width:1200px;margin:0 auto;padding:0 18px}
/* header */
.skx-header{position:sticky;top:0;z-index:50;background:rgba(8,8,8,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--line);padding-top:env(safe-area-inset-top,0px)}
.skx-hrow{display:flex;align-items:center;justify-content:space-between;height:68px;gap:12px}
.skx-logo{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:.16em}
.skx-logo img{width:34px;height:34px;object-fit:contain}
.skx-nav{display:flex;gap:4px}
.skx-nav a{padding:9px 14px;border-radius:999px;color:var(--muted);font-size:.92rem}
.skx-nav a:hover,.skx-nav a.active{color:#fff;background:rgba(22,139,255,.14)}
.skx-nav a.active{box-shadow:inset 0 0 0 1px rgba(22,139,255,.55)}
.skx-hact{display:flex;align-items:center;gap:10px}
.skx-cartbtn{position:relative;width:44px;height:44px;border-radius:50%;border:1px solid var(--line);display:inline-flex;align-items:center;justify-content:center;background:var(--card)}
.skx-cartbtn:hover{border-color:var(--blue);box-shadow:0 0 16px rgba(22,139,255,.4)}
.skx-cartbtn svg{width:22px;height:22px;stroke:#fff;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.skx-count{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:var(--blue);color:#fff;font-size:.72rem;font-weight:800;display:flex;align-items:center;justify-content:center}
.skx-count.zero{background:#333}
.skx-burger{display:none;width:44px;height:44px;border-radius:12px;border:1px solid var(--line);background:var(--card);cursor:pointer;padding:0;flex-direction:column;align-items:center;justify-content:center;gap:5px}
.skx-burger i{display:block;width:20px;height:2px;background:#fff;border-radius:2px;transition:.25s}
.skx-burger.open i:nth-child(1){transform:translateY(7px) rotate(45deg)}
.skx-burger.open i:nth-child(2){opacity:0}
.skx-burger.open i:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
/* buttons */
.skx-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 22px;border-radius:999px;border:1px solid var(--line);background:transparent;color:#fff;font:700 .9rem Arial,Helvetica,sans-serif;cursor:pointer;transition:.2s}
.skx-btn:hover{border-color:var(--blue)}
.skx-btn.primary{background:var(--blue);border-color:var(--blue);color:#fff;box-shadow:0 0 22px rgba(22,139,255,.4)}
.skx-btn.primary:hover{transform:translateY(-2px);box-shadow:0 0 30px rgba(22,139,255,.65)}
.skx-btn.wa{background:#1f8f4e;border-color:#1f8f4e}
.skx-btn[disabled]{opacity:.45;cursor:not-allowed;transform:none;box-shadow:none}
/* hero + sections */
.skx-hero{padding:72px 0 60px;text-align:center;background:radial-gradient(ellipse at 50% 0%,rgba(22,139,255,.25),transparent 62%),#000}
.skx-kicker{display:inline-block;padding:6px 16px;border-radius:999px;border:1px solid rgba(22,139,255,.5);color:var(--cyan);font-size:.74rem;letter-spacing:.26em;text-transform:uppercase}
.skx-hero h1{margin:20px auto 14px;max-width:820px;font-size:clamp(2rem,6vw,3.5rem);line-height:1.1}
.skx-hero h1 em{font-style:normal;color:var(--blue)}
.skx-hero p{margin:0 auto 26px;max-width:620px;color:var(--muted);font-size:1.05rem}
.skx-section{padding:48px 0 24px}
.skx-title{margin:0 0 6px;font-size:clamp(1.5rem,4vw,2.1rem)}
.skx-sub{margin:0 0 22px;color:var(--muted)}
.skx-alt{background:var(--bg2);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
/* shop controls */
.skx-controls{display:grid;grid-template-columns:1fr 210px;gap:12px;margin-bottom:12px}
.skx-field{width:100%;height:48px;padding:0 16px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:#fff;font:1rem Arial,Helvetica,sans-serif;outline:none}
.skx-field:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(22,139,255,.25)}
.skx-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.skx-chip{padding:9px 16px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--muted);font:600 .85rem Arial,Helvetica,sans-serif;cursor:pointer}
.skx-chip:hover{color:#fff;border-color:var(--blue)}
.skx-chip.active{background:var(--blue);border-color:var(--blue);color:#fff}
.skx-resulttext{margin:0 0 16px;color:var(--muted);font-size:.88rem}
/* product grid + cards */
.skx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:22px;margin-bottom:48px}
.skx-card{display:flex;flex-direction:column;border-radius:20px;overflow:hidden;background:var(--card);border:1px solid var(--line);transition:.25s}
.skx-card:hover{transform:translateY(-5px);border-color:rgba(22,139,255,.6);box-shadow:0 16px 36px rgba(0,0,0,.6),0 0 24px rgba(22,139,255,.18)}
.skx-img{position:relative;display:block;aspect-ratio:1/1;background:radial-gradient(circle at 50% 40%,#101a2c,#050505 75%)}
.skx-img img{width:100%;height:100%;object-fit:contain}
.skx-badge{position:absolute;top:12px;left:12px;padding:5px 11px;border-radius:999px;font-size:.7rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;background:rgba(0,0,0,.65);border:1px solid rgba(22,139,255,.5);color:var(--cyan)}
.skx-badge.off{border-color:rgba(255,120,120,.5);color:#ff9a9a}
.skx-body{display:flex;flex-direction:column;gap:8px;padding:16px;flex:1}
.skx-cat{font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:var(--blue)}
.skx-body h3{margin:0;font-size:1.05rem;line-height:1.3}
.skx-desc{margin:0;color:var(--muted);font-size:.88rem;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.skx-pricebox{margin-top:auto;padding-top:4px}
.skx-price{font-size:1.3rem;font-weight:800;color:#fff}
.skx-price.pending{font-size:1rem;color:var(--cyan)}
.skx-note{display:block;color:var(--muted);font-size:.74rem;margin-top:2px}
.skx-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.skx-btns .skx-btn{padding:11px 8px;font-size:.8rem;border-radius:12px}
.skx-empty{grid-column:1/-1;text-align:center;padding:56px 20px;border:1px dashed var(--line);border-radius:18px;color:var(--muted)}
/* trust */
.skx-trust{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.skx-trust div{padding:22px 18px;border-radius:18px;background:var(--card);border:1px solid var(--line);text-align:center}
.skx-trust h3{margin:0 0 6px;font-size:1rem}.skx-trust p{margin:0;color:var(--muted);font-size:.87rem}
/* product detail */
.skx-detail{display:grid;grid-template-columns:1.05fr 1fr;gap:34px;padding:36px 0 56px}
.skx-gallery .main{aspect-ratio:1/1;border-radius:22px;border:1px solid var(--line);background:radial-gradient(circle at 50% 40%,#101a2c,#050505 75%);overflow:hidden}
.skx-gallery .main img{width:100%;height:100%;object-fit:contain}
.skx-thumbs{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap}
.skx-thumbs button{width:72px;height:72px;padding:0;border-radius:12px;border:1px solid var(--line);background:var(--card);cursor:pointer;overflow:hidden}
.skx-thumbs button:hover{border-color:var(--blue)}
.skx-thumbs img{width:100%;height:100%;object-fit:contain}
.skx-info h1{margin:6px 0 10px;font-size:clamp(1.6rem,4vw,2.3rem);line-height:1.15}
.skx-info .skx-price{font-size:1.8rem}
.skx-info p{color:var(--muted)}
.skx-buy{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:20px 0}
.skx-qtyin{width:84px;height:46px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:#fff;text-align:center;font-size:1rem}
.skx-back{display:inline-block;margin-top:8px;color:var(--cyan)}
/* cart */
.skx-cart{padding:36px 0 56px}
.skx-row{display:grid;grid-template-columns:84px 1fr auto;gap:14px;align-items:center;padding:14px;margin-bottom:12px;border-radius:16px;background:var(--card);border:1px solid var(--line)}
.skx-row img{width:84px;height:84px;object-fit:contain;border-radius:12px;background:#050505}
.skx-row h3{margin:0 0 4px;font-size:1rem}.skx-row .u{color:var(--muted);font-size:.86rem}
.skx-line{text-align:right;font-weight:800}
.skx-qty{display:inline-flex;align-items:center;gap:8px;margin-top:8px}
.skx-qty button{width:34px;height:34px;border-radius:10px;border:1px solid var(--line);background:#0b0b0b;color:#fff;font-size:1.1rem;cursor:pointer}
.skx-qty button:hover{border-color:var(--blue)}
.skx-rm{display:block;margin-top:8px;background:none;border:0;color:#ff8a8a;cursor:pointer;font-size:.82rem;text-decoration:underline;padding:0}
.skx-summary{margin-top:18px;padding:20px;border-radius:18px;background:var(--card);border:1px solid rgba(22,139,255,.5)}
.skx-summary .r{display:flex;justify-content:space-between;margin-bottom:10px;color:var(--muted)}
.skx-summary .t{color:#fff;font-size:1.25rem;font-weight:800}
.skx-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
/* footer */
.skx-footer{background:var(--bg2);border-top:1px solid var(--line);padding:48px 0 0}
.skx-fgrid{display:grid;grid-template-columns:1.5fr 1fr 1fr 1.3fr;gap:28px;padding-bottom:30px}
.skx-fgrid h4{margin:0 0 14px;font-size:.82rem;letter-spacing:.2em;text-transform:uppercase}
.skx-fgrid p,.skx-fgrid li,.skx-fgrid a{color:var(--muted);font-size:.9rem}
.skx-fgrid ul{list-style:none;margin:0;padding:0;display:grid;gap:9px}
.skx-fgrid a:hover{color:var(--cyan)}
.skx-copy{padding:18px 0 calc(18px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line);text-align:center;color:var(--muted);font-size:.82rem}
/* toast */
.skx-toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translate(-50%,30px);opacity:0;pointer-events:none;z-index:1000;padding:12px 22px;border-radius:999px;background:#111;color:#fff;font:.9rem Arial,Helvetica,sans-serif;max-width:90vw;text-align:center;transition:.3s;border:1px solid var(--blue);box-shadow:0 0 24px rgba(22,139,255,.4)}
.skx-toast.error{border-color:#ff6b6b;box-shadow:0 0 24px rgba(255,80,80,.35)}
.skx-toast.show{opacity:1;transform:translate(-50%,0)}
/* responsive */
@media (max-width:900px){.skx-trust{grid-template-columns:repeat(2,1fr)}.skx-fgrid{grid-template-columns:1fr 1fr}.skx-detail{grid-template-columns:1fr}}
@media (max-width:768px){.skx-burger{display:flex}
.skx-nav{position:absolute;top:100%;left:0;right:0;flex-direction:column;gap:4px;padding:12px 18px 18px;background:rgba(0,0,0,.98);border-bottom:1px solid var(--line);display:none}
.skx-nav.open{display:flex}.skx-nav a{padding:13px 16px;font-size:1rem}}
@media (max-width:560px){.skx-hero{padding:52px 0 44px}.skx-controls{grid-template-columns:1fr}
.skx-grid{grid-template-columns:repeat(2,1fr);gap:12px}.skx-body{padding:12px}.skx-body h3{font-size:.92rem}.skx-desc{font-size:.8rem}.skx-price{font-size:1.1rem}
.skx-btns{grid-template-columns:1fr}.skx-trust{grid-template-columns:1fr}.skx-fgrid{grid-template-columns:1fr}
.skx-row{grid-template-columns:64px 1fr}.skx-row img{width:64px;height:64px}.skx-line{grid-column:1/-1;text-align:left}}
`;
    var s = document.createElement("style");
    s.id = "skx-styles";
    s.textContent = css;
    document.head.appendChild(s);
  }

  /** Builds the shared header and footer inside #site-header and #site-footer (only if those exist). */
  function buildLayout() {
    var h = document.getElementById("site-header");
    if (h) {
      h.innerHTML =
        '<header class="skx-header"><div class="skx-wrap skx-hrow">' +
        '<a class="skx-logo" href="index.html" aria-label="' + esc(STORE) + ' home">' +
          '<img src="images/logo.svg" alt="" onerror="this.style.display=\'none\'"><span>' + esc(STORE) + '</span></a>' +
        '<nav class="skx-nav" id="skx-nav" aria-label="Main navigation">' +
          '<a href="index.html">Home</a><a href="shop.html">Shop</a><a href="about.html">About</a><a href="contact.html">Contact</a></nav>' +
        '<div class="skx-hact">' +
          '<a class="skx-cartbtn" href="cart.html" aria-label="Shopping cart">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.2a1.6 1.6 0 0 0 1.6 1.3h8.2a1.6 1.6 0 0 0 1.6-1.2L21 8H6"/></svg>' +
            '<span class="skx-count zero">0</span></a>' +
          '<button class="skx-burger" id="skx-burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="skx-nav"><i></i><i></i><i></i></button>' +
        '</div></div></header>';
    }

    var f = document.getElementById("site-footer");
    if (f) {
      var num = String(CFG.whatsapp || "").replace(/\D/g, "");
      var contact = "";
      if (CFG.phone) contact += '<li><a href="tel:' + esc(String(CFG.phone).replace(/\s+/g, "")) + '">Phone: ' + esc(CFG.phone) + '</a></li>';
      if (num.length >= 8) contact += '<li><a href="https://wa.me/' + num + '" target="_blank" rel="noopener noreferrer">WhatsApp: ' + esc(CFG.whatsapp) + '</a></li>';
      if (CFG.email) contact += '<li><a href="mailto:' + esc(CFG.email) + '">' + esc(CFG.email) + '</a></li>';
      if (CFG.address) contact += '<li>' + esc(CFG.address) + '</li>';
      if (!contact) contact = '<li><a href="contact.html">Contact us</a></li>';

      var names = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube" };
      var social = Object.keys(names).filter(function (k) { return SOCIAL[k]; }).map(function (k) {
        return '<li><a href="' + esc(SOCIAL[k]) + '" target="_blank" rel="noopener noreferrer">' + names[k] + '</a></li>';
      }).join("");

      f.innerHTML =
        '<footer class="skx-footer"><div class="skx-wrap"><div class="skx-fgrid">' +
          '<div><a class="skx-logo" href="index.html"><span>' + esc(STORE) + '</span></a><p>' + esc(CFG.tagline || "") + '</p></div>' +
          '<div><h4>Quick Links</h4><ul><li><a href="index.html">Home</a></li><li><a href="shop.html">Shop</a></li><li><a href="cart.html">Cart</a></li><li><a href="about.html">About</a></li><li><a href="contact.html">Contact</a></li></ul></div>' +
          '<div><h4>Support</h4><ul><li><a href="faq.html">FAQ</a></li><li><a href="shipping.html">Shipping</a></li><li><a href="returns.html">Returns</a></li><li><a href="privacy.html">Privacy</a></li><li><a href="terms.html">Terms</a></li></ul></div>' +
          '<div><h4>Contact</h4><ul>' + contact + social + '</ul></div>' +
        '</div><div class="skx-copy">&copy; <span data-year></span> ' + esc(STORE) + '. All rights reserved.</div></div></footer>';
    }
    $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /** Highlights the nav link of the page you are on. */
  function setActiveLinks() {
    var here = currentFile();
    $$(".skx-nav a").forEach(function (a) {
      var file = (a.getAttribute("href") || "").split("#")[0].split("?")[0].toLowerCase();
      var on = file === here;
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  /* ---------- Product cards ---------- */
  function cardHTML(p) {
    var href = "product.html?id=" + encodeURIComponent(p.id);
    return '' +
      '<article class="skx-card">' +
        '<a class="skx-img" href="' + href + '" aria-label="View ' + esc(p.name) + '">' +
          '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy" data-skx-img="1">' +
          '<span class="skx-badge' + (p.available ? '' : ' off') + '">' + (p.available ? 'Available' : 'Unavailable') + '</span>' +
        '</a>' +
        '<div class="skx-body">' +
          (p.category ? '<span class="skx-cat">' + esc(p.category) + '</span>' : '') +
          '<h3><a href="' + href + '">' + esc(p.name) + '</a></h3>' +
          (p.description ? '<p class="skx-desc">' + esc(p.description) + '</p>' : '') +
          '<div class="skx-pricebox">' + priceHTML(p) + '</div>' +
          '<div class="skx-btns">' +
            '<a class="skx-btn" href="' + href + '">View Details</a>' +
            '<button type="button" class="skx-btn primary" data-add="' + esc(p.id) + '"' + (p.available ? '' : ' disabled') + '>' +
              (p.available ? 'Add to Cart' : 'Unavailable') + '</button>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  /* ---------- Shop page: search + category + sort ---------- */
  var shopState = { q: "", cat: "all", sort: "" };

  function renderShop() {
    var grid = document.getElementById("product-grid");
    if (!grid) return;
    var q = shopState.q.trim().toLowerCase();
    var list = PRODUCTS.filter(function (p) {
      var okCat = shopState.cat === "all" || p.category === shopState.cat;
      var okQ = !q || (p.name + " " + p.description + " " + p.category).toLowerCase().indexOf(q) !== -1;
      return okCat && okQ;
    });
    // Sorting: products with no price always go last when sorting by price.
    var byPrice = function (dir) {
      return function (a, b) {
        if (a.price === null && b.price === null) return 0;
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return dir * (a.price - b.price);
      };
    };
    if (shopState.sort === "low") list.sort(byPrice(1));
    else if (shopState.sort === "high") list.sort(byPrice(-1));
    else if (shopState.sort === "az") list.sort(function (a, b) { return a.name.localeCompare(b.name); });

    var count = document.getElementById("shop-count");
    if (count) count.textContent = PRODUCTS.length ? ("Showing " + list.length + " of " + PRODUCTS.length + " products") : "";

    if (!PRODUCTS.length) {
      grid.innerHTML = '<div class="skx-empty">Products could not be loaded. Please check that js/products.js is uploaded, then refresh the page.</div>';
    } else if (!list.length) {
      grid.innerHTML = '<div class="skx-empty">No products match your search. Try another word or category.</div>';
    } else {
      grid.innerHTML = list.map(cardHTML).join("");
    }
  }

  function initShop() {
    if (!document.getElementById("product-grid")) return;
    var chips = document.getElementById("shop-categories");
    var cats = [];
    PRODUCTS.forEach(function (p) { if (p.category && cats.indexOf(p.category) === -1) cats.push(p.category); });

    try {                                  // allows links such as shop.html?category=Chargers
      var qc = new URLSearchParams(location.search).get("category");
      if (qc && cats.indexOf(qc) > -1) shopState.cat = qc;
    } catch (e) { /* ignore */ }

    if (chips) {
      chips.innerHTML = '<button type="button" class="skx-chip" data-cat="all">All</button>' +
        cats.map(function (c) { return '<button type="button" class="skx-chip" data-cat="' + esc(c) + '">' + esc(c) + '</button>'; }).join("");
      var mark = function () {
        $$(".skx-chip", chips).forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-cat") === shopState.cat); });
      };
      mark();
      chips.addEventListener("click", function (e) {
        var b = e.target.closest(".skx-chip");
        if (!b) return;
        shopState.cat = b.getAttribute("data-cat") || "all";
        mark();
        renderShop();
      });
    }
    var search = document.getElementById("shop-search");
    var sort = document.getElementById("shop-sort");
    if (search) search.addEventListener("input", function 
