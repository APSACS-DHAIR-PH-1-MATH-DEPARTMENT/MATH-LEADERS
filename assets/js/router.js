/* router.js — the page shell for every logged-in page: top bar + SIDEBAR, built at RUNTIME from one list.
   Adding or opening a tab later = edit ONE line of TABS (set ready:true when its page exists).
   Phone: the sidebar is a drawer opened by the ☰ button. Wide screens: it is always visible.
   Links are RELATIVE ("dashboard.html"): the site lives under /<repo>/ on GitHub Pages, not at the domain root. */
(function () {
  var TABS = [
    { id: "dashboard", label: "Home",              icon: "🏠", href: "dashboard.html", ready: true },
    { id: "games",     label: "Games",             icon: "🎮", href: "games.html",     ready: false },
    { id: "positions", label: "Positions",         icon: "🏆", href: "positions.html", ready: false },
    { id: "remarks",   label: "Teacher's notes",   icon: "📝", href: "remarks.html",   ready: false },
    { id: "profile",   label: "Profile",           icon: "👤", href: "profile.html",   ready: true }
  ];

  var activeTab = "";

  function esc(s) { return UI.esc(s); }

  function navHtml() {
    return TABS.map(function (t) {
      var inner = '<span class="side__icon" aria-hidden="true">' + t.icon + '</span><span class="side__label">' + esc(t.label) + "</span>";
      if (!t.ready) return '<li><span class="side__item is-soon" aria-disabled="true">' + inner + '<span class="side__tag">Soon</span></span></li>';
      var on = t.id === activeTab;
      return '<li><a class="side__item' + (on ? " is-active" : "") + '" href="' + esc(t.href) + '"' + (on ? ' aria-current="page"' : "") + ">" + inner + "</a></li>";
    }).join("");
  }

  function userHtml(p) {
    if (!p || !p.studentName) return "";
    return '<div class="side__user"><div class="side__uname">' + esc(p.studentName) + '</div><div class="side__umeta">Class ' + esc(p.classLevel) +
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
        '<button class="menu-btn" id="menu-btn" type="button" aria-label="Open menu" aria-controls="app-side" aria-expanded="false">☰</button>' +
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
