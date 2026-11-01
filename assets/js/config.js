/* config.js — the ONLY file you edit after deploying the backend.
   Replace the two PASTE_... values, save, commit. Nothing else in the site changes.
   (Moving to a different backend later = change API_BASE_URL, as long as the API contract stays the same.) */
window.APS_CONFIG = {
  APP_NAME: "Math Leaders",
  DEPARTMENT: "APSACS DHA-I R Phase 1 Mathematics Department",

  // Apps Script web app URL — it ends with /exec  (NOT /dev)
  API_BASE_URL: "PASTE_EXEC_URL_HERE",

  // Student website key (Script Property API_KEY; shown by showFrontendConfig()).
  // Not a secret — anyone can read it in the browser. Real protection = login + session.
  API_KEY: "PASTE_STUDENT_API_KEY_HERE",

  // Classes shown on the registration form. Must match the backend property ALLOWED_CLASSES.
  CLASSES: [5, 6, 7, 8],

  REQUEST_TIMEOUT_MS: 25000   // Apps Script can take 6-8 s to wake up
};
