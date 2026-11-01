/* dashboard.js — Home: greeting, progress tiles (filled when games open) and what is coming. */
(function () {
  var $ = UI.$;
  if (!Auth.requireSession()) return;
  Router.mountShell("dashboard");

  function firstName(full) { return String(full || "").trim().split(/\s+/)[0] || ""; }

  function show(p) {
    $("greet").textContent = "Assalam o Alaikum, " + firstName(p.studentName) + "!";
    $("chip-class").textContent = "Class " + p.classLevel;
    if (p.section) { $("chip-section").hidden = false; $("chip-section").textContent = "Section " + p.section; }
    $("who").textContent = p.studentId;
    Router.setUser(p);
    $("loading").hidden = true; $("home").hidden = false; $("retry").hidden = true; UI.clear($("home-msg"));
  }

  function load() {
    $("loading").hidden = false; $("home").hidden = true; $("retry").hidden = true; UI.clear($("home-msg"));
    var cached = Storage.getProfile();
    if (cached && cached.studentName) show(cached);          // show something at once; refresh below
    Api.profile.me().then(function (p) { Storage.setProfile(p); show(p); })
      .catch(function (e) {
        if (cached && cached.studentName) return;             // keep the cached view if only the refresh failed
        $("loading").hidden = true;
        UI.say($("home-msg"), e.message, "bad");
        $("retry").hidden = false;
      });
  }
  $("retry").addEventListener("click", load);
  load();
})();
