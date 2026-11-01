/* profile.js — the student's own details, log out, and "Change my PIN". */
(function () {
  var $ = UI.$;
  if (!Auth.requireSession()) return;
  Router.mountHeader();
  Router.mountNav("profile");

  function show(p) {
    $("p-id").textContent = p.studentId;
    $("p-name").textContent = p.studentName;
    $("p-father").textContent = p.fatherName;
    $("p-class").textContent = "Class " + p.classLevel;
    $("p-section").textContent = p.section || "—";
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

  $("logout").addEventListener("click", function () { UI.busy($("logout"), true, "Logging out…"); Auth.logout(); });
  $("change-pin").addEventListener("click", function () {
    // Log out first, then open the reset-PIN screen.
    window.Api.auth.logout().catch(function () {}).then(function () {
      Storage.clearSession();
      location.replace("login.html?mode=resetpin");
    });
  });
  load();
})();
