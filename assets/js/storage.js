/* storage.js — session token + small profile cache.
   Every read/write is wrapped in try/catch: storage can throw (private mode, blocked site data).
   "Remember me" keeps the session in localStorage; otherwise it lives only until the tab closes. */
(function () {
  var TOKEN_KEY = "aps:token";
  var PROFILE_KEY = "aps:profile";
  var REMEMBER_KEY = "aps:remember";

  function pick() {
    try { return localStorage.getItem(REMEMBER_KEY) === "1" ? localStorage : sessionStorage; }
    catch (e) { return null; }
  }
  function get(k) { try { var s = pick(); return s ? s.getItem(k) : null; } catch (e) { return null; } }
  function set(k, v) { try { var s = pick(); if (s) s.setItem(k, v); } catch (e) { /* ignore */ } }
  function del(k) {
    try { localStorage.removeItem(k); } catch (e) {}
    try { sessionStorage.removeItem(k); } catch (e) {}
  }

  // Practice / Exercises keep a small per-tab cache (see pager.js). It is wiped together with the session.
  function clearPages() {
    try {
      var s = sessionStorage, doomed = [];
      for (var i = 0; i < s.length; i++) { var k = s.key(i); if (k && k.indexOf("aps:pg:") === 0) doomed.push(k); }
      doomed.forEach(function (k) { s.removeItem(k); });
    } catch (e) { /* ignore */ }
  }

  window.Storage = {
    setRemember: function (on) { try { localStorage.setItem(REMEMBER_KEY, on ? "1" : "0"); } catch (e) {} },
    getToken: function () { return get(TOKEN_KEY); },
    setToken: function (t) { set(TOKEN_KEY, t); },
    getProfile: function () { try { return JSON.parse(get(PROFILE_KEY) || "null"); } catch (e) { return null; } },
    setProfile: function (p) { set(PROFILE_KEY, JSON.stringify(p || null)); },
    clearPages: clearPages,
    clearSession: function () { del(TOKEN_KEY); del(PROFILE_KEY); clearPages(); }
  };
})();
