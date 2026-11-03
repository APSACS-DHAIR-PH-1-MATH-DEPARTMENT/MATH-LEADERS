/* feedback.js — write feedback, see the status of your own messages, read what other students say (approved only). */
(function () {
  var $ = UI.$;
  if (!Auth.requireSession()) return;
  Router.mountShell("feedback");
  var STATUS = { pending: "Waiting to be checked", approved: "Shown to everyone", rejected: "Not shown" };

  function drawMine(list) {
    $("mine-card").hidden = list.length === 0;
    $("mine-list").innerHTML = list.map(function (f) {
      return '<div class="rowcard"><div class="rowcard__top"><span class="small muted">' + UI.esc(DT.format(f.createdAt)) + '</span><span class="status status--' + (f.status === "approved" ? "active" : f.status === "rejected" ? "suspended" : "pending") + '">' + UI.esc(STATUS[f.status] || f.status) + "</span></div>" +
        '<p class="quote">' + UI.esc(f.message) + "</p></div>";
    }).join("");
  }
  function drawAll(list) {
    $("all-empty").hidden = list.length > 0;
    $("all-list").innerHTML = list.map(function (f) {
      return '<figure class="voice"><blockquote>' + UI.esc(f.message) + '</blockquote><figcaption>— ' + UI.esc(f.displayName) + " · Class " + UI.esc(f.classLabel) + "</figcaption></figure>";
    }).join("");
  }

  function load() {
    $("loading").hidden = false; $("fb-wrap").hidden = true; $("retry").hidden = true; UI.clear($("page-msg"));
    Promise.all([Api.feedback.mine(), Api.feedback.approved()]).then(function (r) {
      drawMine(r[0].feedback); drawAll(r[1].feedback);
      $("loading").hidden = true; $("fb-wrap").hidden = false;
    }).catch(function (e) { $("loading").hidden = true; UI.say($("page-msg"), e.message, "bad"); $("retry").hidden = false; });
  }
  $("retry").addEventListener("click", load);

  $("fb-text").addEventListener("input", function () { $("fb-count").textContent = $("fb-text").value.length; });
  $("fb-send").addEventListener("click", function () {
    var text = $("fb-text").value.trim(), msg = $("fb-msg");
    UI.clear(msg);
    if (text.length < 10) return UI.say(msg, "Please write at least 10 characters.", "bad");
    UI.busy($("fb-send"), true, "Sending…");
    Api.feedback.submit(text).then(function (r) {
      UI.busy($("fb-send"), false);
      $("fb-text").value = ""; $("fb-count").textContent = "0";
      UI.say(msg, r.message || "Thank you! Your feedback will appear after it is checked.", "ok");
      return Api.feedback.mine().then(function (m) { drawMine(m.feedback); });
    }).catch(function (e) { UI.busy($("fb-send"), false); UI.say(msg, e.message, "bad"); });
  });

  var cached = Storage.getProfile(); if (cached) Router.setUser(cached);
  load();
})();
