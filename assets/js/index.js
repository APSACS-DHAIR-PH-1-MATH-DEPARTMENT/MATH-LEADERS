/* index.js — send the visitor to the right first page. */
(function () {
  window.location.replace(window.Storage.getToken() ? "dashboard.html" : "login.html");
})();
