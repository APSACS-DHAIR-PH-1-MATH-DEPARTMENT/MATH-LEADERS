/* config.js — the ONLY site file that holds backend settings. Already filled in.
   (Moving to a different backend later = change API_BASE_URL, as long as the API contract stays the same.)
   Both values below are PUBLIC by design (they are visible in the browser). Never put any secret here. */
window.APS_CONFIG = {
  APP_NAME: "Math Leaders",
  DEPARTMENT: "APSACS DHA-I R Phase 1 Mathematics Department",

  // Apps Script web app URL — it ends with /exec  (NOT /dev)
  API_BASE_URL: "https://script.google.com/macros/s/AKfycbwzWi1Sif7TvHR-0xmCjmdrP2xJZ_aWCcJrQvLqQQbdo9qYS-Esdq3abHxRy8wuARt9qw/exec",

  // Student website key (Script Property API_KEY; shown by showFrontendConfig()).
  // Not a secret — anyone can read it in the browser. Real protection = login + session.
  API_KEY: "apsk_2ad491ef16a84b6cb02fbcea7d0536b32caf9cd0",

  // Classes shown on the registration form. Must match the backend property ALLOWED_CLASSES.
  CLASSES: [5, 6, 7, 8],

  REQUEST_TIMEOUT_MS: 25000   // Apps Script can take 6-8 s to wake up
};
