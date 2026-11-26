/*!
 * SK GRIP PRO - js/config.js
 * Store settings used by every page.
 * Load order on every page: js/config.js -> js/products.js -> js/app.js
 *
 * Do NOT put passwords, API keys or payment credentials in this file.
 * It is public: anyone can read it in their browser.
 */
window.STORE_CONFIG = Object.freeze({
  // ----- Brand -----
  storeName: "SK GRIP PRO",
  tagline: "Your phone. Your perfect grip.",
  siteUrl: "https://shahzeb34356khan-beep.github.io/SKGripProWebsite/",

  // ----- Money -----
  currency: "USD",          // currency code
  currencySymbol: "$",      // shown before prices

  // ----- Contact (used in header, footer, contact page, WhatsApp orders) -----
  phone: "03417698886",
  whatsapp: "923454827323", // digits only: country code + number, no "+" and no spaces
  email: "shahzeb112ali@gmail.com",
  address: "",              // add your business address here when you want it shown

  // ----- Social media (leave "" to hide a link) -----
  social: {
    facebook: "",
    instagram: "",
    tiktok: "",
    youtube: ""
  },

  // ----- Site behaviour -----
  whatsappGreeting: "Hello SK GRIP PRO, I would like to place an order:",
  defaultImage: "images/accessory.svg"   // shown when a product image is missing
});
