/**
 * SK GRIP PRO - Product Catalog
 * File: js/products.js
 *
 * Loaded after js/config.js and before js/app.js.
 * Exposes a global array: window.products
 *
 * NOTES:
 * - The price below is a TEMPORARY DEMONSTRATION PRICE and is NOT confirmed.
 *   Replace it with the final price and set priceConfirmed to true when ready.
 * - No stock quantities, customer reviews or verified specifications are
 *   included. Add them only once they have been confirmed.
 * - Image paths are relative so they work on GitHub Pages. Place the matching
 *   image files inside the images/ folder (or update the paths below).
 */
(function (window) {
  "use strict";

  window.products = [
    {
      id: "sk-grip-pro-magnetic-phone-stand",
      name: "SK Grip Pro Magnetic Phone Stand",

      // TEMPORARY DEMONSTRATION PRICE - UNCONFIRMED
      price: 29.99,
      currency: "USD",
      priceConfirmed: false,
      priceNote: "Demonstration price - not confirmed. Final pricing will be confirmed before purchase.",

      category: "Phone Accessories",
      description:
        "The SK Grip Pro Magnetic Phone Stand is the main product of the SK GRIP PRO store. " +
        "Full product details and specifications will be added once they have been confirmed.",

      image: "images/sk-grip-pro-magnetic-phone-stand.jpg",
      images: [
        "images/sk-grip-pro-magnetic-phone-stand.jpg"
      ],

      featured: true,
      available: true
    }
  ];
})(window);
