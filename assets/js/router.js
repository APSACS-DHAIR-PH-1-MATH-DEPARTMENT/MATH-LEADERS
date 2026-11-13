/* router.js — the page shell for every logged-in page: top bar + SIDEBAR, built at RUNTIME from one list.
   Adding or opening a tab later = edit ONE line of TABS (set ready:true when its page exists).
   Phone: the sidebar is a drawer opened by the menu button. Wide screens: it is always visible.
   Links are RELATIVE ("dashboard.html"): the site lives under /<repo>/ on GitHub Pages, not at the domain root. */
(function () {
  var TABS = [
    { id: "dashboard", label: "Home",              icon: "home", href: "dashboard.html", ready: true },
    { id: "report",    label: "Weekly report",     icon: "trend", href: "report.html",    ready: true },
    { id: "tests",     label: "Tests",             icon: "target", href: "tests.html",     ready: true },
    { id: "practice",  label: "Practice",          icon: "bolt", href: "practice.html",  ready: true },
    { id: "exercises", label: "Exercises",         icon: "book", href: "exercises.html", ready: true },
    { id: "help",      label: "Help & requests",   icon: "pencil", href: "help.html",     ready: true },
    { id: "issues",    label: "Disciplinary issues", icon: "clipboard", href: "issues.html",  ready: true },
    { id: "feedback",  label: "Feedback",          icon: "chat", href: "feedback.html",  ready: true },
    { id: "notes",     label: "Teacher's notes",   icon: "note", href: "notes.html",     ready: true },
    { id: "profile",   label: "Profile",           icon: "user", href: "profile.html",   ready: true }
  ];

  var activeTab = "";

  /* The department's message. Shown on Home (every time it opens) and, automatically, at the bottom of
     every other logged-in page. To change the wording, edit ONLY this block. */
  var INITIATIVE = window.Initiative;   // the wording lives in initiative.js (one copy for the whole site)

  function initiativeHtml() {
    return '<section class="card note-card" aria-label="' + esc(INITIATIVE.title) + '"><h2>' + esc(INITIATIVE.title) + "</h2>" +
      INITIATIVE.paras.map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("") + "</section>";
  }

  /* Fills <div id="initiative"> if the page has one (Home); otherwise adds the card at the end of <main>. */
  function mountInitiative() {
    if (!INITIATIVE) return;   // a page that does not load initiative.js (the test page) shows no message, so nothing distracts a child during a test
    var host = document.getElementById("initiative");
    if (host) { host.innerHTML = initiativeHtml(); return; }
    var main = document.querySelector("main.wrap--app");
    if (main) { var box = document.createElement("div"); box.id = "initiative"; box.innerHTML = initiativeHtml(); main.appendChild(box); }
  }

  function esc(s) { return UI.esc(s); }

  function navHtml() {
    return TABS.map(function (t) {
      var inner = '<span class="side__icon" aria-hidden="true">' + UI.icon(t.icon) + '</span><span class="side__label">' + esc(t.label) + "</span>";
      if (!t.ready) return '<li><span class="side__item is-soon" aria-disabled="true">' + inner + '<span class="side__tag">Soon</span></span></li>';
      var on = t.id === activeTab;
      return '<li><a class="side__item' + (on ? " is-active" : "") + '" href="' + esc(t.href) + '"' + (on ? ' aria-current="page"' : "") + ">" + inner + "</a></li>";
    }).join("");
  }

  function userHtml(p) {
    if (!p || !p.studentName) return "";
    return '<div class="side__user"><div class="side__uname">' + esc(UI.name(p.studentName)) + '</div><div class="side__umeta">Class ' + esc(p.classLevel) +
      (p.section ? " · Section " + esc(p.section) : "") + "</div></div>";
  }

  function open(on) {
    document.body.classList.toggle("side-open", !!on);
    var btn = document.getElementById("menu-btn");
    if (btn) btn.setAttribute("aria-expanded", on ? "true" : "false");
    var scrim = document.getElementById("scrim");
    if (scrim) scrim.hidden = !on;
  }

  function mountShell(activeId) {
    activeTab = activeId;
    var cfg = window.APS_CONFIG;

    var top = document.getElementById("app-header");
    if (top) {
      top.innerHTML =
        '<button class="menu-btn" id="menu-btn" type="button" aria-label="Open menu" aria-controls="app-side" aria-expanded="false">' + UI.icon("menu") + '</button>' +
        '<img class="header__logo" src="assets/img/logo-128.webp" width="40" height="40" alt="">' +
        '<div class="topbar__text"><div class="header__title">' + esc(cfg.APP_NAME) + '</div><div class="header__sub">' + esc(cfg.DEPARTMENT) + "</div></div>";
    }

    var side = document.getElementById("app-side");
    if (side) {
      side.innerHTML =
        '<div class="side__brand"><img src="assets/img/logo-128.webp" width="56" height="56" alt=""><div><div class="side__app">' + esc(cfg.APP_NAME) +
        '</div><div class="side__dept">APSACS DHA-I R Phase 1</div></div></div>' +
        '<div id="side-user">' + userHtml(Storage.getProfile()) + "</div>" +
        '<nav aria-label="Main"><ul class="side__list" id="side-list">' + navHtml() + "</ul></nav>" +
        '<div class="side__bottom"><button class="side__logout" id="side-logout" type="button">Log out</button></div>';
      document.getElementById("side-logout").addEventListener("click", function () { Auth.logout(); });
    }

    mountInitiative();

    var scrim = document.getElementById("scrim");
    var menu = document.getElementById("menu-btn");
    if (menu) menu.addEventListener("click", function () { open(!document.body.classList.contains("side-open")); });
    if (scrim) scrim.addEventListener("click", function () { open(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") open(false); });
  }

  /* Call once the profile is known, to show the student's name in the sidebar. */
  function setUser(p) {
    var host = document.getElementById("side-user");
    if (host) host.innerHTML = userHtml(p);
  }

  window.Router = { mountShell: mountShell, setUser: setUser, TABS: TABS };
})();
