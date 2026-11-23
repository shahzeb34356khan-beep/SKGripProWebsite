/* =====================================================================
   SK GRIP PRO - PRODUCTS FILE   (YOUR PHONE. YOUR PERFECT GRIP.)
   This is the ONLY file you edit to add or change products.

   HOW TO ADD A PRODUCT (beginner steps):
   1. Find a product block that starts with { and ends with },
   2. Copy the whole block and paste it right after the last block.
   3. Change the values inside the quotes. Keep every comma.
   4. Every "id" must be unique: lowercase letters, numbers and dashes only.

   FIELD GUIDE:
   id             unique code, used in the product page link
   name           product name
   price          number only, no $ sign, e.g. 19.99  (DEMONSTRATION PRICE until you confirm)
   currency       "USD"
   category       must match one category id listed in CATEGORIES below
   description    text shown on the product page
   mainImage      the main picture, e.g. "images/my-photo.jpg"
   images         list of all pictures (gallery). The main image is added automatically.
   featured       true = shown on the home page
   available      true = can be ordered, false = shown as sold out
   stockQuantity  DEMO number. 0 automatically makes the product sold out.
   specifications list of { label, value }. Only add details you have verified.
   sample         true = shows a "Sample" label. Use false once the product is real.

   There are NO customer reviews or ratings here. Only add them when they are real.
   ===================================================================== */

window.CATEGORIES = [
  { id: "magnetic-grips",     name: "Magnetic Phone Grips" },
  { id: "magnetic-stands",    name: "Magnetic Phone Stands" },
  { id: "phone-holders",      name: "Phone Holders" },
  { id: "charging",           name: "Charging Accessories" },
  { id: "mobile-accessories", name: "Mobile Accessories" }
];

window.products = [
  /* ---------- FEATURED PRODUCT ---------- */
  {
    id: "magnetic-360-phone-stand",
    name: "SK Grip Pro Magnetic 360° Phone Stand",
    price: 24.99,                         // DEMONSTRATION PRICE - not a confirmed selling price
    currency: "USD",
    category: "magnetic-stands",
    description: "Premium aluminium alloy magnetic phone stand with 360-degree rotation, in black. Compatible with MagSafe iPhones, and with compatible Android phones using an adapter ring. (Demonstration listing: update with your confirmed details.)",
    mainImage: "images/stand-front.svg",  // SAMPLE IMAGE - replace with your real photo
    images: ["images/stand-front.svg", "images/stand-side.svg", "images/stand-back.svg"],
    featured: true,
    available: true,
    stockQuantity: 10,                    // DEMO NUMBER
    specifications: [
      { label: "Design",         value: "Premium aluminium alloy" },
      { label: "Rotation",       value: "360-degree" },
      { label: "Attachment",     value: "Magnetic" },
      { label: "Colour",         value: "Black" },
      { label: "Compatibility",  value: "MagSafe iPhones, and compatible Android phones using an adapter ring" }
    ],
    sample: true
  },

  /* ---------- DEMO PRODUCTS (copy these blocks as templates) ---------- */
  {
    id: "sample-magnetic-grip",
    name: "Sample Magnetic Phone Grip",
    price: 14.99,                         // DEMONSTRATION PRICE
    currency: "USD",
    category: "magnetic-grips",
    description: "SAMPLE PRODUCT. Replace this text with your real description.",
    mainImage: "images/grip.svg",
    images: ["images/grip.svg"],
    featured: true,
    available: true,
    stockQuantity: 10,                    // DEMO NUMBER
    specifications: [ { label: "Details", value: "To be added" } ],
    sample: true
  },
  {
    id: "sample-car-holder",
    name: "Sample Phone Holder",
    price: 17.99,                         // DEMONSTRATION PRICE
    currency: "USD",
    category: "phone-holders",
    description: "SAMPLE PRODUCT. Replace this text with your real description.",
    mainImage: "images/holder.svg",
    images: ["images/holder.svg"],
    featured: true,
    available: true,
    stockQuantity: 10,                    // DEMO NUMBER
    specifications: [ { label: "Details", value: "To be added" } ],
    sample: true
  },
  {
    id: "sample-wireless-charger",
    name: "Sample Charging Pad",
    price: 22.99,                         // DEMONSTRATION PRICE
    currency: "USD",
    category: "charging",
    description: "SAMPLE PRODUCT. Replace this text with your real description.",
    mainImage: "images/charger.svg",
    images: ["images/charger.svg"],
    featured: false,
    available: false,                     // shows as Sold out
    stockQuantity: 0,
    specifications: [ { label: "Details", value: "To be added" } ],
    sample: true
  },
  {
    id: "sample-accessory",
    name: "Sample Mobile Accessory",
    price: 9.99,                          // DEMONSTRATION PRICE
    currency: "USD",
    category: "mobile-accessories",
    description: "SAMPLE PRODUCT. Replace this text with your real description.",
    mainImage: "images/accessory.svg",
    images: ["images/accessory.svg"],
    featured: false,
    available: true,
    stockQuantity: 10,                    // DEMO NUMBER
    specifications: [ { label: "Details", value: "To be added" } ],
    sample: true
  }
];

/* ---------- Automatic tidy-up. Do not edit below this line. ---------- */
(function () {
  window.products.forEach(function (p) {
    p.currency = p.currency || "USD";
    p.mainImage = p.mainImage || (p.images && p.images[0]) || "images/logo.svg";
    var rest = (p.images || []).filter(function (src) { return src !== p.mainImage; });
    p.images = [p.mainImage].concat(rest);              // main image is always first
    p.stockQuantity = Number(p.stockQuantity) || 0;
    p.available = p.available !== false && p.stockQuantity > 0;  // 0 stock = sold out
    p.specifications = p.specifications || [];
  });
  window.PRODUCTS = window.products;   // the shop scripts read this name
})();
