/* index.js — the public Home page: department message + approved student feedback (first name and class only). */
(function () {
  var $ = UI.$;
  var loggedIn = !!Storage.getToken();
  if (loggedIn) {
    $("cta-login").textContent = "Go to my dashboard"; $("cta-login").href = "dashboard.html";
    $("cta-register").hidden = true;
  }

  var host = $("initiative"), I = window.Initiative;
  if (host && I) host.innerHTML = '<article class="note-card card"><h3 class="note-card__t">' + UI.esc(I.title) + "</h3>" + I.paras.map(function (t) { return "<p>" + UI.esc(t) + "</p>"; }).join("") + "</article>";

  Api.feedback.publicList().then(function (r) {
    if (!r.feedback || !r.feedback.length) return;
    $("voices-list").innerHTML = r.feedback.map(function (f) {
      return '<figure class="voice"><blockquote>' + UI.esc(f.message) + '</blockquote><figcaption>— ' + UI.esc(f.displayName) + " · Class " + UI.esc(f.classLabel) + "</figcaption></figure>";
    }).join("");
    $("voices").hidden = false;
  }).catch(function () { /* the home page works without it */ });
})();
