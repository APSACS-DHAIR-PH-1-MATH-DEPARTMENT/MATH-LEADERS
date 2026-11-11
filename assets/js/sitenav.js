/* sitenav.js — the website menu on the PUBLIC pages (Home, Log in, Register). Built at runtime from one list.
   Needs <header id="site-nav"> and <body data-page="home|login|register">. Links are relative (the site lives under /<repo>/). */
(function () {
  var page = document.body.getAttribute("data-page") || "";
  var loggedIn = !!window.Storage.getToken();
  var LINKS = [
    { id: "home",     label: "Home",     href: "index.html" },
    { id: "about",    label: "About",    href: "index.html#about" },
    { id: "features", label: "What you get", href: "index.html#features" },
    { id: "voices",   label: "Feedback", href: "index.html#voices" }
  ];
  function esc(s) { return UI.esc(s); }

  var host = document.getElementById("site-nav");
  if (!host) return;
  var cfg = window.APS_CONFIG || {};

  var links = LINKS.map(function (l) {
    return '<li><a class="sitenav__link' + (l.id === page ? " is-active" : "") + '" href="' + esc(l.href) + '"' + (l.id === page ? ' aria-current="page"' : "") + ">" + esc(l.label) + "</a></li>";
  }).join("");
  var actions = loggedIn
    ? '<li><a class="btn btn--small" href="dashboard.html">My dashboard</a></li>'
    : '<li><a class="sitenav__link' + (page === "register" ? " is-active" : "") + '" href="register.html">Register</a></li>' +
      '<li><a class="btn btn--small" href="login.html">Log in</a></li>';

  host.className = "sitenav";
  host.innerHTML =
    '<div class="sitenav__inner">' +
    '<a class="sitenav__brand" href="index.html"><img src="assets/img/logo-128.webp" width="40" height="40" alt=""><span><span class="sitenav__name">' + esc(cfg.APP_NAME || "Math Leaders") +
    '</span><span class="sitenav__dept">APSACS DHA-I R Phase 1 Mathematics</span></span></a>' +
    '<button class="sitenav__toggle" id="nav-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="nav-panel">' + UI.icon("menu") + '</button>' +
    '<nav class="sitenav__panel" id="nav-panel" aria-label="Main"><ul class="sitenav__list">' + links + actions + "</ul></nav></div>";

  var btn = document.getElementById("nav-toggle"), panel = document.getElementById("nav-panel");
  function setOpen(on) {
    panel.classList.toggle("is-open", on);
    btn.setAttribute("aria-expanded", on ? "true" : "false");
    btn.innerHTML = UI.icon(on ? "close" : "menu");
    btn.setAttribute("aria-label", on ? "Close menu" : "Open menu");
  }
  btn.addEventListener("click", function () { setOpen(!panel.classList.contains("is-open")); });
  panel.addEventListener("click", function (e) { if (e.target && e.target.tagName === "A") setOpen(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
})();
