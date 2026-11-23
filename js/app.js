/* =====================================================================
   SK GRIP PRO - MAIN SCRIPT (js/app.js)
   Runs on every page. It builds the menu and footer, then runs the
   code for whichever page is open (home, shop, product, cart, etc.).
   Needs: js/config.js and js/products.js loaded BEFORE this file.
   You normally do NOT need to edit this file.
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- 1. Settings and data ---------- */
  var C = window.SK_CONFIG || {};
  var P = window.products || window.PRODUCTS || [];   // products from products.js
  var CATS = window.CATEGORIES || [];
  C.currency = C.currency || "USD";
  C.whatsappNumber = C.whatsappNumber || "";
  C.payments = C.payments || { enabled: false, checkoutEndpoint: "" };

  /* ---------- 2. Small helper functions ---------- */
  // Find one element / many elements (returns null / empty list if missing)
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  // Safely put HTML into an element. Does nothing if the element is missing.
  function setHTML(sel, html) { var el = $(sel); if (el) el.innerHTML = html; return el; }
  // Safely listen for an event on an element that may be missing.
  function on(sel, ev, fn) { var el = $(sel); if (el) el.addEventListener(ev, fn); return el; }
  // Format a number as money, e.g. $24.99
  function money(n) {
    try { return new Intl.NumberFormat("en-US", { style: "currency", currency: C.currency }).format(n); }
    catch (e) { return "$" + Number(n).toFixed(2); }
  }
  // Make text safe to put inside HTML
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function byId(id) { return P.find(function (p) { return p.id === id; }); }
  function catName(id) { var c = CATS.find(function (x) { return x.id === id; }); return c ? c.name : id; }
  function param(name) { return new URLSearchParams(location.search).get(name) || ""; }
  function mainImage(p) { return (p.images && p.images[0]) || p.mainImage || "images/logo.svg"; }

  /* ---------- 3. Cart (saved in this phone's browser only) ----------
     Only product ids and quantities are saved. NO card details, ever. */
  var KEY = "skgrippro_cart";
  function getCart() {
    try {
      var list = JSON.parse(localStorage.getItem(KEY) || "[]");
      return list.filter(function (i) { return byId(i.id) && i.qty > 0; });   // drop removed products
    } catch (e) { return []; }
  }
  function saveCart(c) {
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {}
    updateBadge();
  }
  function addToCart(id, qty) {
    var p = byId(id);
    if (!p || !p.available) { toast("Sorry, this product is unavailable."); return; }
    var cart = getCart(), line = cart.find(function (x) { return x.id === id; });
    if (line) line.qty = Math.min(99, line.qty + qty); else cart.push({ id: id, qty: qty });
    saveCart(cart);
    toast("Added to cart");
  }
  function updateBadge() {   // the small number next to "Cart"
    var n = getCart().reduce(function (sum, i) { return sum + i.qty; }, 0);
    $$(".cart-count").forEach(function (b) { b.textContent = n; b.hidden = n === 0; });
  }
  function toast(msg) {      // small message that pops up at the bottom
    var t = $("#toast"); if (!t) return;
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  /* ---------- 4. Header, mobile menu and footer ---------- */
  function buildLayout() {
    var page = document.body.getAttribute("data-page");
    var links = [["index.html", "Home", "home"], ["shop.html", "Shop All", "shop"], ["about.html", "About Us", "about"],
                 ["contact.html", "Contact", "contact"], ["faq.html", "FAQ", "faq"]];
    setHTML("#site-header",
      '<header class="header"><div class="wrap bar">' +
      '<a class="brand" href="index.html"><img src="images/logo.svg" alt="" width="34" height="34"><span>SK GRIP <b>PRO</b></span></a>' +
      '<nav id="nav" class="nav" aria-label="Main">' +
      links.map(function (l) { return '<a href="' + l[0] + '"' + (page === l[2] ? ' class="active"' : "") + ">" + l[1] + "</a>"; }).join("") +
      "</nav>" +
      '<a class="cart-link" href="cart.html" aria-label="Shopping cart">Cart <span class="cart-count" hidden>0</span></a>' +
      '<button id="menu" class="menu" aria-label="Open menu" aria-expanded="false"><i></i><i></i><i></i></button>' +
      "</div></header>");
    setHTML("#site-footer",
      '<footer class="footer"><div class="wrap fgrid">' +
      '<div><div class="brand"><img src="images/logo.svg" alt="" width="30" height="30"><span>SK GRIP <b>PRO</b></span></div><p class="muted">' + esc(C.tagline || "") + "</p></div>" +
      '<div><h4>Shop</h4><a href="shop.html">Shop All</a><a href="cart.html">Shopping Cart</a></div>' +
      '<div><h4>Company</h4><a href="about.html">About Us</a><a href="contact.html">Contact Us</a><a href="faq.html">FAQ</a></div>' +
      '<div><h4>Policies</h4><a href="shipping.html">Shipping Policy</a><a href="returns.html">Returns &amp; Refunds</a><a href="privacy.html">Privacy Policy</a><a href="terms.html">Terms &amp; Conditions</a></div>' +
      '</div><div class="wrap copy">&copy; ' + new Date().getFullYear() + " SK GRIP PRO. All rights reserved.</div></footer>");
    var t = document.createElement("div");
    t.id = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t);
    // Mobile menu button: open / close the menu
    on("#menu", "click", function () {
      var open = $("#nav").classList.toggle("open");
      this.classList.toggle("on", open);
      this.setAttribute("aria-expanded", open);
    });
    // Close the mobile menu after tapping a link
    $$("#nav a").forEach(function (a) {
      a.addEventListener("click", function () { var n = $("#nav"); if (n) n.classList.remove("open"); });
    });
    updateBadge();
  }

  /* ---------- 5. Product card (used on home, shop and product pages) ---------- */
  function card(p) {
    var link = "product.html?id=" + encodeURIComponent(p.id);
    return '<article class="card tilt reveal">' +
      '<a class="card-img" href="' + link + '"><img src="' + esc(mainImage(p)) + '" alt="' + esc(p.name) + '" loading="lazy">' +
      (p.sample ? '<span class="tag">Sample</span>' : "") +
      (p.available ? "" : '<span class="tag out">Sold out</span>') + "</a>" +
      '<div class="card-body"><small>' + esc(catName(p.category)) + "</small>" +
      '<h3><a href="' + link + '">' + esc(p.name) + "</a></h3>" +
      '<div class="row"><strong>' + money(p.price) + (p.sample ? ' <em class="muted">demo price</em>' : "") + "</strong>" +
      '<button class="btn sm" data-add="' + esc(p.id) + '"' + (p.available ? "" : " disabled") + ">" + (p.available ? "Add" : "Sold out") + "</button></div></div></article>";
  }

  /* ---------- 6. HOME PAGE: categories and featured products ---------- */
  function homePage() {
    var featured = P.filter(function (p) { return p.featured; });
    setHTML("#featured", featured.length ? featured.map(card).join("") : '<p class="muted">No featured products yet.</p>');
    setHTML("#cats", CATS.map(function (c) {
      return '<a class="cat tilt reveal" href="shop.html?cat=' + encodeURIComponent(c.id) + '"><span>' + esc(c.name) + "</span><i>&rarr;</i></a>";
    }).join(""));
    var hero = $("#hero-link");   // hero button goes to the first featured product
    if (hero && featured[0]) hero.href = "product.html?id=" + encodeURIComponent(featured[0].id);
    heroAnimation();
  }

  /* ---------- 7. SHOP PAGE: search, category filter, price sorting ---------- */
  function shopPage() {
    var catBox = $("#cat"), qBox = $("#q"), sortBox = $("#sort");
    if (!$("#grid")) return;
    if (catBox) {
      catBox.innerHTML = '<option value="">All categories</option>' +
        CATS.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + "</option>"; }).join("");
      catBox.value = param("cat");
    }
    if (qBox) qBox.value = param("q");

    function draw() {
      var q = qBox ? qBox.value.trim().toLowerCase() : "";
      var cat = catBox ? catBox.value : "";
      var sort = sortBox ? sortBox.value : "";
      var list = P.filter(function (p) {
        var text = (p.name + " " + p.description + " " + catName(p.category)).toLowerCase();
        return (!cat || p.category === cat) && (!q || text.indexOf(q) > -1);
      });
      if (sort === "low") list.sort(function (a, b) { return a.price - b.price; });
      if (sort === "high") list.sort(function (a, b) { return b.price - a.price; });
      if (sort === "az") list.sort(function (a, b) { return a.name.localeCompare(b.name); });
      var count = $("#count");
      if (count) count.textContent = list.length + (list.length === 1 ? " product" : " products");
      setHTML("#grid", list.length ? list.map(card).join("") :
        '<div class="empty" style="grid-column:1/-1"><h3>No products found</h3><p class="muted">Try a different search or choose "All categories".</p></div>');
      reveal();
    }
    [qBox, catBox, sortBox].forEach(function (el) {
      if (el) { el.addEventListener("input", draw); el.addEventListener("change", draw); }
    });
    draw();
  }

  /* ---------- 8. WhatsApp link (number comes from js/config.js) ---------- */
  function whatsappLink(text) {
    var number = String(C.whatsappNumber).replace(/\D/g, "");
    return "https://wa.me/" + number + "?text=" + encodeURIComponent(text);
  }

  /* ---------- 9. PRODUCT PAGE ---------- */
  function specsHtml(p) {
    var s = p.specifications; if (!s || !s.length) return "";
    return '<h3 style="margin:1rem 0 .4rem">Specifications</h3><ul style="padding-left:1.2rem;color:#c4ccd8">' +
      s.map(function (x) { return "<li><b>" + esc(x.label) + ":</b> " + esc(x.value) + "</li>"; }).join("") + "</ul>";
  }

  function productPage() {
    var box = $("#product"); if (!box) return;
    var p = byId(param("id"));
    if (!p) {
      box.innerHTML = '<div class="empty"><h1>Product not found</h1><p class="muted">This product does not exist or was removed.</p><a class="btn" href="shop.html">Back to shop</a></div>';
      return;
    }
    document.title = p.name + " | SK GRIP PRO";
    var imgs = p.images && p.images.length ? p.images : [mainImage(p)];
    box.innerHTML =
      '<div class="pgrid"><div><div class="stage tilt"><img id="main-img" src="' + esc(imgs[0]) + '" alt="' + esc(p.name) + '"></div>' +
      '<div class="thumbs">' + imgs.map(function (src, i) {
        return '<button class="thumb' + (i ? "" : " on") + '" data-src="' + esc(src) + '" aria-label="View image ' + (i + 1) + '"><img src="' + esc(src) + '" alt=""></button>';
      }).join("") + "</div></div>" +
      '<div><small class="muted">' + esc(catName(p.category)) + "</small><h1>" + esc(p.name) + "</h1>" +
      '<p class="price">' + money(p.price) + "</p>" +
      (p.sample ? '<p class="notice">SAMPLE DATA: price, stock and description are demonstration placeholders until real details are added.</p>' : "") +
      '<p class="stock ' + (p.available ? "ok" : "no") + '">' + (p.available ? "In stock" : "Currently unavailable") + "</p>" +
      "<p>" + esc(p.description) + "</p>" + specsHtml(p) +
      '<div class="buy"><div class="qty"><button data-d="-1" aria-label="Decrease">&minus;</button><span id="pq">1</span><button data-d="1" aria-label="Increase">+</button></div>' +
      '<button class="btn" id="add"' + (p.available ? "" : " disabled") + ">Add to cart</button></div>" +
      '<a class="btn ghost wide" target="_blank" rel="noopener" href="' + esc(whatsappLink("Hello SK GRIP PRO, I want to order: " + p.name)) + '">Order on WhatsApp</a></div></div>';

    var qty = 1;
    box.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.dataset.src) {   // change the big picture
        $("#main-img").src = b.dataset.src;
        $$(".thumb").forEach(function (t) { t.classList.toggle("on", t === b); });
      }
      if (b.dataset.d) { qty = Math.max(1, Math.min(99, qty + Number(b.dataset.d))); $("#pq").textContent = qty; }
      if (b.id === "add") addToCart(p.id, qty);
    });
    var related = P.filter(function (x) { return x.category === p.category && x.id !== p.id; }).slice(0, 3);
    if (related.length) setHTML("#related", '<h2>You may also like</h2><div class="grid">' + related.map(card).join("") + "</div>");
    reveal();
  }

  /* ---------- 10. CART PAGE ---------- */
  function cartPage() {
    var box = $("#cart"); if (!box) return;

    function draw() {
      var cart = getCart();
      if (!cart.length) {
        box.innerHTML = '<div class="empty"><h2>Your cart is empty</h2><p class="muted">Add something you like.</p><a class="btn" href="shop.html">Continue shopping</a></div>';
        return;
      }
      var subtotal = 0, hasSample = false, lines = [];
      var rows = cart.map(function (i) {
        var p = byId(i.id), total = p.price * i.qty;
        subtotal += total; if (p.sample) hasSample = true;
        lines.push("- " + p.name + " x" + i.qty + " = " + money(total));
        return '<div class="line"><img src="' + esc(mainImage(p)) + '" alt="">' +
          '<div class="info"><a href="product.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.name) + '</a><br><small class="muted">' + money(p.price) + " each</small></div>" +
          '<div class="qty" data-id="' + esc(p.id) + '"><button data-a="dec" aria-label="Decrease">&minus;</button><span>' + i.qty + '</span><button data-a="inc" aria-label="Increase">+</button></div>' +
          "<strong>" + money(total) + "</strong>" +
          '<button class="x" data-a="rm" data-id="' + esc(p.id) + '" aria-label="Remove ' + esc(p.name) + '">&times;</button></div>';
      }).join("");
      var message = "Hello SK GRIP PRO, I would like to place this order:\n" + lines.join("\n") +
        "\nSubtotal: " + money(subtotal) + "\nPlease confirm availability, shipping cost and payment method.";
      box.innerHTML = '<div class="cgrid"><div>' + rows + "</div>" +
        '<aside class="summary"><h2>Order summary</h2><div class="row"><span>Subtotal</span><strong>' + money(subtotal) + "</strong></div>" +
        '<p class="muted small">Shipping and taxes are confirmed when we reply to your order.</p>' +
        (hasSample ? '<p class="notice">Demonstration prices shown. Not final.</p>' : "") +
        '<a class="btn wide" target="_blank" rel="noopener" href="' + esc(whatsappLink(message)) + '">Order on WhatsApp</a>' +
        '<button class="btn ghost wide" id="pay">Pay online (coming soon)</button>' +
        '<div class="steps"><h3>How checkout works</h3><ol>' +
        "<li>Tap <b>Order on WhatsApp</b>. Your cart is typed for you.</li><li>Press send in WhatsApp.</li>" +
        "<li>We confirm stock, shipping and total.</li><li>We give you payment instructions.</li><li>We ship after payment is confirmed.</li></ol></div>" +
        '<button class="link" id="clear">Clear cart</button></aside></div>';
    }

    // One click listener handles +, -, remove, clear and pay buttons
    box.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var cart = getCart();
      var holder = b.closest(".qty");
      var id = b.dataset.id || (holder && holder.dataset.id);
      var line = cart.find(function (x) { return x.id === id; });
      if (b.id === "pay") { startOnlinePayment(cart); return; }
      if (b.dataset.a === "inc" && line) line.qty = Math.min(99, line.qty + 1);
      if (b.dataset.a === "dec" && line) line.qty -= 1;                       // 0 removes the line
      if (b.dataset.a === "rm") cart = cart.filter(function (x) { return x.id !== id; });
      if (b.id === "clear") cart = [];
      saveCart(cart.filter(function (x) { return x.qty > 0; }));
      draw();
    });
    draw();
  }

  /* ---------- 11. Future Safepay hook (NOT ACTIVE) ----------
     Payments do NOT work yet. This only runs after you set enabled:true and a
     checkoutEndpoint in config.js AND build a secure backend. Only product ids and
     quantities are sent; your server must work out prices. The customer pays on
     Safepay's own page, so this website never sees card details. */
  function startOnlinePayment(cart) {
    var pay = C.payments;
    if (!pay.enabled || !pay.checkoutEndpoint) {
      toast("Online payment is not active yet. Please order on WhatsApp.");
      return;
    }
    fetch(pay.checkoutEndpoint, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && d.checkoutUrl) location.href = d.checkoutUrl; else toast("Payment could not start."); })
      .catch(function () { toast("Payment could not start."); });
  }

  /* ---------- 12. CONTACT and FAQ pages ---------- */
  function contactPage() {
    var wa = $("#wa-contact"); if (wa) wa.href = whatsappLink("Hello SK GRIP PRO, I have a question.");
    var mail = $("#mail"); if (mail) { mail.textContent = C.email || ""; mail.href = "mailto:" + (C.email || ""); }
    on("#cform", "submit", function (e) {   // opens the visitor's email app
      e.preventDefault();
      var f = e.target;
      var body = "Name: " + f.name.value + "\nEmail: " + f.email.value + "\n\n" + f.message.value;
      location.href = "mailto:" + (C.email || "") + "?subject=" + encodeURIComponent("Message from " + f.name.value) + "&body=" + encodeURIComponent(body);
    });
  }
  function faqPage() {
    $$(".faq button").forEach(function (b) {
      b.addEventListener("click", function () {
        var open = b.parentElement.classList.toggle("open");
        b.setAttribute("aria-expanded", open);
      });
    });
  }

  /* ---------- 13. Effects: scroll fade-in and 3D card tilt ---------- */
  var observer = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); observer.unobserve(en.target); } });
  }, { threshold: 0.1 }) : null;
  function reveal() {
    $$(".reveal:not(.in)").forEach(function (el) { if (observer) observer.observe(el); else el.classList.add("in"); });
  }
  document.addEventListener("pointermove", function (e) {   // tilt only with a mouse
    if (e.pointerType !== "mouse") return;
    var t = e.target.closest ? e.target.closest(".tilt") : null; if (!t) return;
    var r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    t.style.transform = "perspective(800px) rotateY(" + x * 10 + "deg) rotateX(" + (-y * 10) + "deg) translateY(-6px)";
  });
  document.addEventListener("pointerout", function (e) {
    var t = e.target.closest ? e.target.closest(".tilt") : null;
    if (t && !t.contains(e.relatedTarget)) t.style.transform = "";
  });

  /* ---------- 14. Lightweight Three.js 3D hero (home page only) ----------
     If Three.js or WebGL is not available, the page still works without it. */
  function heroAnimation() {
    var canvas = $("#hero3d");
    if (!canvas || !window.THREE) return;
    var T = window.THREE, renderer;
    try { renderer = new T.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true }); } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(40, 1, 0.1, 100); camera.position.set(0, 0, 7.5);
    var group = new T.Group(); scene.add(group);
    var silver = new T.MeshStandardMaterial({ color: 0xc9d1d9, metalness: 0.9, roughnes
