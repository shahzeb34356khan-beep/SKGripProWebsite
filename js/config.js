/**
 * SK GRIP PRO - Store Configuration
 * File: js/config.js
 *
 * Loaded before js/products.js and js/app.js.
 * Exposes a single global object: window.STORE_CONFIG
 *
 * IMPORTANT: This file is public (served via GitHub Pages).
 * Never add secret keys, passwords, API tokens or payment credentials here.
 */
(function (window) {
  "use strict";

  var websiteUrl = "https://shahzeb34356khan-beep.github.io/SKGripProWebsite/";
  var phone = "03417698886";
  var whatsapp = "923454827323";
  var email = "shahzeb112ali@gmail.com";

  var config = {
    store: {
      name: "SK GRIP PRO"
    },

    currency: {
      code: "USD",
      symbol: "$",
      locale: "en-US"
    },

    contact: {
      phone: phone,
      phoneLink: "tel:" + phone,
      whatsapp: whatsapp,
      whatsappLink: "https://wa.me/" + whatsapp,
      email: email,
      emailLink: "mailto:" + email
    },

    website: {
      url: websiteUrl
    },

    /**
     * Helper: build a full URL for a page or asset on this site.
     * Works with GitHub Pages project sites (sub-folder hosting).
     * Example: STORE_CONFIG.getUrl("shipping.html")
     */
    getUrl: function (path) {
      var cleanPath = String(path || "").replace(/^\/+/, "");
      return websiteUrl + cleanPath;
    },

    /**
     * Helper: format a number as currency using the store currency.
     * Example: STORE_CONFIG.formatPrice(25) -> "$25.00"
     */
    formatPrice: function (amount) {
      var value = Number(amount);
      if (!isFinite(value)) {
        return "";
      }
      try {
        return new Intl.NumberFormat(config.currency.locale, {
          style: "currency",
          currency: config.currency.code
        }).format(value);
      } catch (error) {
        return config.currency.symbol + value.toFixed(2);
      }
    },

    /**
     * Helper: build a WhatsApp link with an optional pre-filled message.
     * Example: STORE_CONFIG.getWhatsAppLink("Hello, I have a question.")
     */
    getWhatsAppLink: function (message) {
      var base = config.contact.whatsappLink;
      return message ? base + "?text=" + encodeURIComponent(message) : base;
    }
  };

  // Prevent accidental changes at runtime.
  Object.freeze(config.store);
  Object.freeze(config.currency);
  Object.freeze(config.contact);
  Object.freeze(config.website);
  Object.freeze(config);

  window.STORE_CONFIG = config;
})(window);
