/* exercises.js — Exercises & worksheets: pick a chapter, then an exercise or worksheet, then see every question with its written solution.
   A "Video dekho" button appears only on questions that have a video (it plays inside the page, only after a tap).
   Server text is only ever inserted as text (TeX.set for formulas). */
(function () {
  var $ = UI.$;
  if (!Auth.requireSession()) return;
  Router.mountShell("exercises");

  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  var PAGE = Pager.PAGE, PG = null, OPT = null;

  function card(q) {
    var c = h("article", "card pq");
    var chips = h("div", "qcard__chips");
    chips.appendChild(h("span", "chip", "Q " + q.qNo));
    chips.appendChild(h("span", "chip chip--id", q.exerciseQuestionId));
    if (q.videoId) chips.appendChild(h("span", "chip chip--marks", "Video"));
    c.appendChild(chips);
    var qt = h("div", "qtext"); TeX.set(qt, q.question); c.appendChild(qt);

    var sol = h("div", "ans__why pq__solution"); sol.hidden = true;
    sol.appendChild(h("b", "", "Solution: ")); var st = h("span", "ans__written"); TeX.set(st, q.solution); sol.appendChild(st);
    if (q.answer) { var a = h("p", "pq__ans"); a.appendChild(h("b", "", "Answer: ")); var as = h("span"); TeX.set(as, q.answer); a.appendChild(as); sol.appendChild(a); }

    var bar = h("div", "actions");
    var sb = h("button", "btn btn--small", "Show solution"); sb.type = "button"; sb.setAttribute("aria-expanded", "false");
    sb.addEventListener("click", function () { sol.hidden = !sol.hidden; sb.textContent = sol.hidden ? "Show solution" : "Hide solution"; sb.setAttribute("aria-expanded", sol.hidden ? "false" : "true"); });
    bar.appendChild(sb); c.appendChild(bar); c.appendChild(sol);
    if (q.videoId) c.appendChild(Video.button(q.videoId));
    c.appendChild(Ask.helpButton({ questionId: q.exerciseQuestionId }, ""));
    return c;
  }

  function open(ch, col) {
    if (PG) PG.destroy();
    $("pick").hidden = true; $("run").hidden = false; UI.clear($("page-msg"));
    $("run-title").textContent = col.collectionName; $("run-sub").textContent = ch.chapter + " · " + (col.collectionType === "worksheet" ? "Worksheet" : "Exercise");
    PG = Pager.create({
      listEl: $("q-list"), moreEl: $("more"), countEl: $("q-count"), emptyEl: $("q-empty"), pageSize: PAGE,
      cache: Pager.pageCache(OPT, "x|" + ch.chapterRef + "|" + col.collectionType + "|" + col.collectionName, PAGE),
      idOf: function (q) { return q.exerciseQuestionId; },
      render: card,
      fetch: function (offset, limit) {
        return Api.exercises.list(ch.chapterRef, col.collectionType, col.collectionName, { offset: offset, limit: limit }).then(function (r) {
          return { items: r.questions || [], total: r.total, hasMore: r.hasMore, next: r.next, v: r.v };
        });
      },
      onOk: function () { UI.clear($("page-msg")); },
      onError: function (e) { UI.say($("page-msg"), e.message, "bad"); }
    });
    PG.start();
  }

  function pickScreen(r, isRefresh) {
    var box = $("chapters"); box.textContent = "";
    (r.chapters || []).forEach(function (ch) {
      var c = h("article", "rowcard");
      c.appendChild(h("div", "rowcard__name", ch.chapter));
      var cols = h("div", "list");
      ch.collections.forEach(function (col) {
        var b = h("button", "colbtn"); b.type = "button";
        b.appendChild(h("span", "colbtn__t", col.collectionName));
        var meta = col.count + " question" + (col.count === 1 ? "" : "s") + (col.videos ? " · " + col.videos + " with video" : "");
        b.appendChild(h("span", "colbtn__m small muted", (col.collectionType === "worksheet" ? "Worksheet · " : "Exercise · ") + meta));
        b.addEventListener("click", function () { open(ch, col); });
        cols.appendChild(b);
      });
      c.appendChild(cols); box.appendChild(c);
    });
    $("none-card").hidden = (r.chapters || []).length > 0;
    $("loading").hidden = true; $("ex-wrap").hidden = false; $("retry").hidden = true;
    if (!isRefresh) { $("pick").hidden = false; $("run").hidden = true; }   // a quiet refresh must never pull the child out of a chapter
  }

  function load() {
    $("loading").hidden = false; $("ex-wrap").hidden = true; $("retry").hidden = true; UI.clear($("page-msg"));
    OPT = Pager.options("exercises", function () { return Api.exercises.options(); }, pickScreen, function (e) {
      $("loading").hidden = true; UI.say($("page-msg"), /was not found/.test(e.message || "") ? "Exercises are not switched on yet. Please try again later." : e.message, "bad"); $("retry").hidden = false;
    });
  }
  $("retry").addEventListener("click", load);
  $("back").addEventListener("click", function () { if (PG) PG.destroy(); PG = null; UI.clear($("page-msg")); $("run").hidden = true; $("pick").hidden = false; $("q-list").textContent = ""; window.scrollTo(0, 0); });
  var cached = Storage.getProfile(); if (cached) Router.setUser(cached);
  load();
})();
