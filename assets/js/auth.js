/* auth.js — login, logout, the page guard, and input rules that mirror the backend. */
(function () {
  var ID_RE = /^WHA-STU-\d{7}$/;

  // People type IDs in lower case or with spaces; fix that before checking.
  function normalizeId(raw) { return String(raw || "").replace(/\s+/g, "").toUpperCase(); }
  function isValidStudentId(id) { return ID_RE.test(normalizeId(id)); }

  function pinRuleError(pin) {
    var p = String(pin || "");
    if (!/^\d{6}$/.test(p)) return "The PIN must be exactly 6 digits.";
    if (/^(\d)\1{5}$/.test(p)) return "The PIN cannot be one digit repeated (like 111111).";
    return null;
  }

  function login(studentId, pin, rememberMe) {
    window.Storage.setRemember(rememberMe);
    return window.Api.auth.login(normalizeId(studentId), pin, rememberMe).then(function (data) {
      if (!data || !data.token) throw new Error("The server did not return a session. Please try again.");
      window.Storage.setToken(data.token);
      window.Storage.setProfile(data.profile || null);
      return data;
    });
  }

  function logout() {
    // The server cancels the token; we clear this device even if that call fails.
    return window.Api.auth.logout().catch(function () {}).then(function () {
      window.Storage.clearSession();
      window.location.replace("login.html");
    });
  }

  // First line of every page that needs a login.
  function requireSession() {
    if (!window.Storage.getToken()) { window.location.replace("login.html"); return false; }
    return true;
  }

  window.Auth = { normalizeId: normalizeId, isValidStudentId: isValidStudentId, pinRuleError: pinRuleError, login: login, logout: logout, requireSession: requireSession };
})();
