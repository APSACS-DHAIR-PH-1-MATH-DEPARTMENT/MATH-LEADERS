/* router.js — the header and the bottom navigation, built at RUNTIME from one list.
   Adding a tab later (Games, Positions, My Notes) = add ONE line to TABS.
   Links are RELATIVE ("dashboard.html"): the site lives under /<repo>/ on GitHub Pages, not at the domain root. */
(function () {
  var TABS = [
    { id: "dashboard", label: "Home",    href: "dashboard.html" },
    { id: "profile",   label: "Profile", href: "profile.html" }
    // Step 4+:  { id: "games", label: "Games", href: "games.html" },
    //           { id: "positions", label: "Positions", href: "positions.html" },
    //           { id: "remarks", label: "My Notes", href: "remarks.html" }
  ];

  function mountNav(activeId) {
    var host = document.getElementById("app-nav");
    if (!host) return;
    host.innerHTML = TABS.map(function (t) {
      return '<a class="nav__tab' + (t.id === activeId ? " is-active" : "") + '" href="' + UI.esc(t.href) + '"' +
        (t.id === activeId ? ' aria-current="page"' : "") + ">" + UI.esc(t.label) + "</a>";
    }).join("");
  }

  function mountHeader() {
    var host = document.getElementById("app-header");
    if (!host) return;
    var cfg = window.APS_CONFIG;
    host.innerHTML =
      '<img class="header__logo" src="assets/img/logo-128.webp" width="44" height="44" alt="">' +
      '<div><div class="header__title">' + UI.esc(cfg.APP_NAME) + '</div>' +
      '<div class="header__sub">' + UI.esc(cfg.DEPARTMENT) + "</div></div>";
  }

  window.Router = { mountNav: mountNav, mountHeader: mountHeader };
})();
