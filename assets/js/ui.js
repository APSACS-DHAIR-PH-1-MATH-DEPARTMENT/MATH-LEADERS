/* ui.js — tiny helpers shared by every page (no framework). */
(function () {
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(id) { return document.getElementById(id); }

  /* Shows a message in a notice box. kind: "ok" | "bad" | "info". aria-live makes screen readers read it. */
  function say(el, text, kind) {
    if (!el) return;
    el.hidden = false;
    el.className = "notice notice--" + (kind || "info");
    el.textContent = text;
  }
  function clear(el) { if (el) { el.hidden = true; el.textContent = ""; } }

  /* Disables a button while a request runs, so one tap = one request. */
  function busy(btn, on, busyLabel) {
    if (!btn) return;
    if (on) { btn.setAttribute("data-label", btn.textContent); btn.disabled = true; if (busyLabel) btn.textContent = busyLabel; }
    else { btn.disabled = false; var l = btn.getAttribute("data-label"); if (l) btn.textContent = l; }
  }

  /* Wires every <button data-toggle-pin="inputId"> to show/hide that PIN field. */
  function wirePinToggles(root) {
    var btns = (root || document).querySelectorAll("[data-toggle-pin]");
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener("click", function () {
        var input = $(b.getAttribute("data-toggle-pin"));
        if (!input) return;
        var show = input.type === "password";
        input.type = show ? "text" : "password";
        b.textContent = show ? "Hide" : "Show";
        b.setAttribute("aria-pressed", show ? "true" : "false");
      });
    });
  }

  /* Keeps only digits in an input (PIN / code fields). */
  function digitsOnly(input) {
    input.addEventListener("input", function () {
      var v = input.value.replace(/\D+/g, "");
      if (v !== input.value) input.value = v;
    });
  }

  /* ---- Icons: real inline SVG (the strict CSP forbids inline style/script, so they are built here from path data and
     use only presentation attributes). Colour follows the text colour (currentColor), size follows the font size. ---- */
  var ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    gamepad: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 10v5M4.5 12.5h5"/><circle cx="16" cy="11.5" r=".8"/><circle cx="18.5" cy="14" r=".8"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
    note: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
    school: '<path d="M3 21h18M5 21V10l7-5 7 5v11M10 21v-6h4v6"/><circle cx="12" cy="10" r="1"/>',
    book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5zM6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5M22 9v5"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    pencil: '<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19zM14.5 6.5l3 3"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    thumb: '<path d="M7 11v9H4v-9zM7 11l4-8a2 2 0 0 1 2 2v4h5.5a2 2 0 0 1 2 2.3l-1.2 6.6a2 2 0 0 1-2 1.6H7"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
    heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>'
  };

  /* UI.icon("home") -> an <svg> string you can put inside innerHTML. Unknown names give "" (nothing breaks). */
  function icon(name) {
    var body = ICONS[name];
    if (!body) return "";
    return '<svg class="icon" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + body + "</svg>";
  }

  /* Any element written as <span data-icon="star"></span> gets the icon. Safe to call again after adding new HTML. */
  function fillIcons(root) {
    var list = (root || document).querySelectorAll("[data-icon]");
    Array.prototype.forEach.call(list, function (el) {
      if (el.getAttribute("data-icon-done") === "1") return;
      el.innerHTML = icon(el.getAttribute("data-icon"));
      el.setAttribute("data-icon-done", "1");
    });
  }

  /* ---- Names: the server saves names in Proper Case. This shows older rows that were saved before that (and any
     name typed in capitals) the same way. Same rule as Names.gs: only plain names are touched. ---- */
  function name(value) {
    var s = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
    if (!s) return "";
    try {
      if (!/^[\p{L}\p{M} .'\-’]+$/u.test(s)) return s;
      return s.toLowerCase().replace(/(^|[ .'\-’])(\p{L})/gu, function (m, sep, ch) { return sep + ch.toUpperCase(); });
    } catch (e) { return s; }   // an old browser without Unicode property escapes: show it as saved
  }

  /* ---- Logo lightbox: tap a logo (that is not a link) to see it big, view only. Tap anywhere or press Esc to close. ---- */
  var lightboxEl = null, lightboxFrom = null;
  function closeLightbox() {
    if (!lightboxEl) return;
    lightboxEl.parentNode && lightboxEl.parentNode.removeChild(lightboxEl);
    lightboxEl = null;
    document.body.classList.remove("lightbox-open");
    if (lightboxFrom && lightboxFrom.focus) { try { lightboxFrom.focus(); } catch (e) { /* ignore */ } }
    lightboxFrom = null;
  }
  function openLightbox(srcImg) {
    if (lightboxEl) return;
    var big = String(srcImg.getAttribute("src") || "").replace(/logo-\d+\.webp/, "logo-512.webp");
    lightboxEl = document.createElement("div");
    lightboxEl.className = "lightbox";
    lightboxEl.setAttribute("role", "dialog");
    lightboxEl.setAttribute("aria-modal", "true");
    lightboxEl.setAttribute("aria-label", "Department logo. Tap anywhere to close.");
    lightboxEl.tabIndex = -1;
    var img = document.createElement("img");
    img.className = "lightbox__img";
    img.src = big;
    img.alt = "APSACS DHA-I R Phase 1 Mathematics Department logo";
    lightboxEl.appendChild(img);
    var hint = document.createElement("div");
    hint.className = "lightbox__hint";
    hint.textContent = "Tap anywhere to close";
    lightboxEl.appendChild(hint);
    lightboxEl.addEventListener("click", function (e) { e.stopPropagation(); closeLightbox(); });   // stopPropagation: the big logo must not re-open itself
    lightboxFrom = document.activeElement;
    document.body.appendChild(lightboxEl);
    document.body.classList.add("lightbox-open");
    lightboxEl.focus();
  }
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || t.tagName !== "IMG" || lightboxEl) return;
    if (!/assets\/img\/logo-\d+\.webp/.test(t.getAttribute("src") || "")) return;
    if (t.closest && t.closest("a, button")) return;     // a logo that is a link keeps its job (go Home)
    openLightbox(t);
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLightbox(); });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { fillIcons(); });
  else fillIcons();

  window.UI = { icon: icon, fillIcons: fillIcons, name: name, esc: esc, $: $, say: say, clear: clear, busy: busy, wirePinToggles: wirePinToggles, digitsOnly: digitsOnly };
  window.esc = esc;
})();
