/* profile.js — the student's own details and "Change my password". (Log out lives in the sidebar.) */
(function () {
  var $ = UI.$;
  if (!Auth.requireSession()) return;
  Router.mountShell("profile");

  function show(p) {
    $("p-id").textContent = p.studentId;
    $("p-name").textContent = p.studentName;
    $("p-father").textContent = p.fatherName;
    $("p-class").textContent = "Class " + p.classLevel;
    $("p-section").textContent = p.section || "—";
    Router.setUser(p);
    $("loading").hidden = true; $("prof").hidden = false; $("retry").hidden = true; UI.clear($("prof-msg"));
  }

  function load() {
    $("retry").hidden = true; UI.clear($("prof-msg"));
    var cached = Storage.getProfile();
    if (cached && cached.studentName) show(cached);
    Api.profile.me().then(function (p) { Storage.setProfile(p); show(p); })
      .catch(function (e) {
        if (cached && cached.studentName) return;
        $("loading").hidden = true; UI.say($("prof-msg"), e.message, "bad"); $("retry").hidden = false;
      });
  }
  $("retry").addEventListener("click", load);

  $("change-pin").addEventListener("click", function () {
    // Log out first, then open the reset-PIN screen.
    window.Api.auth.logout().catch(function () {}).then(function () {
      Storage.clearSession();
      location.replace("login.html?mode=resetpin");
    });
  });
  load();
})();
