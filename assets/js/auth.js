/* auth.js — login, logout, the page guard, and input rules that mirror the backend. */
(function () {
  var ID_RE = /^WHA-STU-\d{7}$/;

  // People type IDs in lower case or with spaces; fix that before checking.
  function normalizeId(raw) { return String(raw || "").replace(/\s+/g, "").toUpperCase(); }
  function isValidStudentId(id) { return ID_RE.test(normalizeId(id)); }

  // Rules for a NEW password (first time / forgot). Same rules as the server.
  function pinRuleError(pw) {
    var p = String(pw || "");
    if (p.length < 8 || p.length > 16) return "The password must be 8 to 16 characters long.";
    if (!/^[\x21-\x7E]+$/.test(p)) return "Use only letters, numbers and symbols from the keyboard (no spaces).";
    if (!/[A-Z]/.test(p)) return "The password needs at least one capital letter.";
    if (!/[a-z]/.test(p)) return "The password needs at least one small letter.";
    if (!/[0-9]/.test(p)) return "The password needs at least one number.";
    if (!/[^A-Za-z0-9]/.test(p)) return "The password needs at least one special character, like ! @ # $ %.";
    return null;
  }
  // Logging in: old 6-digit PINs and new passwords are both accepted, the server checks the match.
  function loginSecretError(pw) {
    var p = String(pw || "");
    if (p.length < 6 || p.length > 16) return "Please type your password.";
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

  window.Auth = { normalizeId: normalizeId, isValidStudentId: isValidStudentId, pinRuleError: pinRuleError, loginSecretError: loginSecretError, login: login, logout: logout, requireSession: requireSession };
})();
