/* SK GRIP PRO - STORE SETTINGS. Edit the values between the quotes. */
window.SK_CONFIG = {
  brand: "SK GRIP PRO",
  tagline: "YOUR PHONE. YOUR PERFECT GRIP.",
  // WhatsApp number: country code + number, digits only, no + or spaces. Example USA: 15551234567
  // THIS IS A PLACEHOLDER - REPLACE WITH YOUR REAL NUMBER.
  whatsappNumber: "15550000000",
  // Contact email shown on the Contact page. PLACEHOLDER - replace.
  email: "support@example.com",
  currency: "USD",
  // Safepay is NOT active. See the guide. Keep enabled:false until you have approved
  // credentials AND a backend (server) that creates the payment session.
  payments: {
    provider: "safepay",
    enabled: false,
    checkoutEndpoint: "" // your future backend URL, e.g. https://your-server.com/create-checkout
  }
};
