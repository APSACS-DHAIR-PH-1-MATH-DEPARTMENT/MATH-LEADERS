/* help.js — Help & requests: ask about a question by its ID, and read the teacher's replies (with the old and new marks of a recheck).
   All server text is inserted as text (TeX.set for formulas); links in a reply are shown only if they start with https://. */
(function () {
  var $ = UI.$;
  if (!Auth.requireSession()) return;
  Router.mountShell("help");

  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  var STATUS = { open: ["Waiting for your teacher", "status--pending"], answered: ["Answered", "status--active"], closed: ["Closed", "status--archived"] };

  function scoreText(s) { return s ? s.marks + " / " + s.total + " marks (" + s.pct + "%)" : ""; }

  function changeLine(c) {
    var parts = [];
    if (c.marksBefore !== c.marksAfter) parts.push("marks " + (c.marksBefore === null ? "not marked" : c.marksBefore) + " → " + c.marksAfter + " of " + c.max);
    if (c.remarkBefore !== c.remarkAfter) parts.push("remark: " + (c.remarkBefore ? "“" + c.remarkBefore + "” → " : "") + (c.remarkAfter ? "“" + c.remarkAfter + "”" : "removed"));
    return c.questionId + ": " + parts.join("; ");
  }

  function card(r) {
    var st = STATUS[r.status] || STATUS.open, c = h("article", "rowcard" + (r.unread ? " rowcard--new" : ""));
    var top = h("div", "rowcard__top"), left = h("div");
    left.appendChild(h("div", "rowcard__name", r.type === "recheck" ? "Recheck: " + (r.testTitle || "test") : "Question " + r.targetId));
    left.appendChild(h("div", "small muted", DT.format(r.createdAt)));
    top.appendChild(left); top.appendChild(h("span", "status " + st[1], r.unread ? "New reply" : st[0])); c.appendChild(top);
    if (r.type === "help" && r.questionText) { var q = h("div", "qtext qtext--sm"); TeX.set(q, r.questionText); c.appendChild(q); }
    if (r.type === "recheck") c.appendChild(h("p", "small", r.questionIds.length ? "Questions: " + r.questionIds.join(", ") : "The whole test"));
    if (r.type === "help" && r.videoId && window.Video) c.appendChild(Video.button(r.videoId));
    if (r.studentNote) { var n = h("p", "small"); n.appendChild(h("b", "", r.type === "recheck" ? "Your reason: " : "Your note: ")); n.appendChild(document.createTextNode(r.studentNote)); c.appendChild(n); }
    if (r.status !== "open" && (r.response || r.responseLink)) {
      var rep = h("div", "ans__why"); rep.appendChild(h("b", "", (r.respondedByName ? UI.name(r.respondedByName) : "Your teacher") + " replied: "));
      var t = h("span", "ans__written"); t.textContent = r.response; rep.appendChild(t);
      if (r.responseLink && /^https:\/\//i.test(r.responseLink)) {
        var a = h("a", "btn btn--small", "Open the link"); a.href = r.responseLink; a.target = "_blank"; a.rel = "noopener noreferrer"; var w = h("div", "actions"); w.appendChild(a); rep.appendChild(w);
      }
      rep.appendChild(h("div", "small muted", DT.format(r.respondedAt))); c.appendChild(rep);
    }
    if (r.type === "recheck" && r.status === "answered") {
      if (r.scoreBefore && r.scoreAfter) {
        var sc = h("div", "notice notice--info");
        sc.appendChild(h("b", "", r.changes.length ? "Your marks were changed. " : "Your marks stay the same. "));
        sc.appendChild(document.createTextNode("Before: " + scoreText(r.scoreBefore) + " · Now: " + scoreText(r.scoreAfter)));
        c.appendChild(sc);
      } else if (!r.changes.length) c.appendChild(h("p", "small muted", "Your teacher checked and did not change any marks."));
      if (r.changes.length) { var ul = h("ul", "advice"); r.changes.forEach(function (x) { ul.appendChild(h("li", "small", changeLine(x))); }); c.appendChild(ul); }
    }
    if (r.status === "open" || r.status === "answered") {
      var wd = h("button", "linkbtn", r.status === "open" ? "Cancel this request" : "Close"); wd.type = "button";
      wd.addEventListener("click", function () { UI.busy(wd, true, "…"); Api.requests.withdraw(r.requestId).then(load).catch(function (e) { UI.busy(wd, false); UI.say($("page-msg"), e.message, "bad"); }); });
      c.appendChild(wd);
    }
    return c;
  }

  function draw(r) {
    var box = $("req-list"); box.textContent = "";
    r.requests.forEach(function (x) { box.appendChild(card(x)); });
    $("req-empty").hidden = r.requests.length > 0;
    $("loading").hidden = true; $("help-wrap").hidden = false; $("retry").hidden = true;
    if (r.unread) Api.requests.seen().catch(function () { /* ignore */ });
  }

  function load() {
    UI.clear($("page-msg"));
    return Api.requests.mine().then(draw).catch(function (e) { $("loading").hidden = true; UI.say($("page-msg"), e.message, "bad"); $("retry").hidden = false; });
  }

  $("retry").addEventListener("click", load);
  $("ask-form").addEventListener("submit", function (ev) {
    ev.preventDefault(); var msg = $("a-msg"), btn = $("a-send"); UI.clear(msg);
    var qid = $("a-qid").value.trim();
    if (qid.length < 3) { UI.say(msg, "Type the question ID, for example T000012-003.", "bad"); return; }
    UI.busy(btn, true, "Sending…");
    Api.requests.create({ type: "help", questionId: qid, note: $("a-note").value.trim() }).then(function () {
      UI.busy(btn, false); $("a-qid").value = ""; $("a-note").value = ""; UI.say(msg, "Sent. Your teacher will reply here.", "ok"); return load();
    }).catch(function (e) { UI.busy(btn, false); UI.say(msg, e.message, "bad"); });
  });
  var cached = Storage.getProfile(); if (cached) Router.setUser(cached);
  load();
})();
