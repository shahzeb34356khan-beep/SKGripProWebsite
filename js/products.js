/*!
 * SK GRIP PRO - js/products.js
 * Product list used by shop.html, index.html, product.html and cart.html.
 * Load order on every page: js/config.js -> js/products.js -> js/app.js
 *
 * HOW TO EDIT
 * - price: a number such as 29.99, or null while the price is not decided.
 * - priceConfirmed: set to true only when the price is final.
 * - available: true = customers can add it to the cart; false = shown as unavailable.
 * - image: main picture. images: extra pictures (used on product.html).
 * - Every "id" must be unique, lowercase, with no spaces.
 */
window.products = [
  {
    id: "sk-grip-pro-magnetic-stand",
    name: "SK GRIP PRO 360° Magnetic Phone Stand",
    price: 29.99,
    currency: "USD",
    priceConfirmed: false,
    priceNote: "Temporary demonstration price - not confirmed.",
    category: "Phone Stands",
    description: "Magnetic phone stand with a 360° rotating head and an adjustable support arm on a stable base.",
    image: "images/stand-front.svg",
    images: [
      "images/stand-front.svg",
      "images/stand-side.svg",
      "images/stand-back.svg"
    ],
    featured: true,
    available: true
  },
  {
    id: "sk-grip-pro-magnetic-phone-grip",
    name: "SK GRIP PRO Magnetic Phone Grip",
    price: null,
    currency: "USD",
    priceConfirmed: false,
    priceNote: "Price to be confirmed.",
    category: "Phone Grips",
    description: "Magnetic phone grip with a circular magnetic ring and a rotating joint.",
    image: "images/grip.svg",
    images: ["images/grip.svg"],
    featured: true,
    available: true
  },
  {
    id: "sk-grip-pro-adjustable-phone-holder",
    name: "SK GRIP PRO Adjustable Phone Holder",
    price: null,
    currency: "USD",
    priceConfirmed: false,
    priceNote: "Price to be confirmed.",
    category: "Phone Holders",
    description: "Desktop phone holder with an adjustable viewing angle and a stable base.",
    image: "images/holder.svg",
    images: ["images/holder.svg"],
    featured: true,
    available: true
  },
  {
    id: "sk-grip-pro-wireless-charging-pad",
    name: "SK GRIP PRO Wireless Charging Pad",
    price: null,
    currency: "USD",
    priceConfirmed: false,
    priceNote: "Price to be confirmed.",
    category: "Chargers",
    description: "Wireless charging pad with a glowing blue charging ring.",
    image: "images/charger.svg",
    images: ["images/charger.svg"],
    featured: false,
    available: true
  },
  {
    id: "sk-grip-pro-accessories-collection",
    name: "SK GRIP PRO Mobile Accessories Collection",
    price: null,
    currency: "USD",
    priceConfirmed: false,
    priceNote: "Price to be confirmed.",
    category: "Accessories",
    description: "A collection of premium mobile accessories: magnetic ring, USB-C cable and phone accessory.",
    image: "images/accessory.svg",
    images: ["images/accessory.svg"],
    featured: false,
    available: true
  }
];
