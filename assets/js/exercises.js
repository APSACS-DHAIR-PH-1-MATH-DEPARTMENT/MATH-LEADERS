/* exercises.js — Exercises & worksheets: pick a chapter, then an exercise or worksheet, then see every question with its written solution.
   A "Video dekho" button appears only on questions that have a video (it plays inside the page, only after a tap).
   Server text is only ever inserted as text (TeX.set for formulas). */
(function () {
  var $ = UI.$;
  if (!Auth.requireSession()) return;
  Router.mountShell("exercises");

  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  var PAGE = 15, STATE = { all: [], shown: 0 };

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

  function more() {
    var list = $("q-list"), end = Math.min(STATE.all.length, STATE.shown + PAGE);
    for (var i = STATE.shown; i < end; i++) list.appendChild(card(STATE.all[i]));
    STATE.shown = end; $("more").hidden = STATE.shown >= STATE.all.length;
    $("q-count").textContent = STATE.all.length + " question" + (STATE.all.length === 1 ? "" : "s") + " · showing " + STATE.shown;
  }

  function open(ch, col) {
    $("pick").hidden = true; $("run").hidden = false; UI.clear($("page-msg"));
    $("run-title").textContent = col.collectionName; $("run-sub").textContent = ch.chapter + " · " + (col.collectionType === "worksheet" ? "Worksheet" : "Exercise");
    $("q-list").textContent = ""; $("q-count").textContent = "Loading…"; $("more").hidden = true;
    Api.exercises.list(ch.chapterRef, col.collectionType, col.collectionName).then(function (r) {
      STATE.all = r.questions || []; STATE.shown = 0; $("q-list").textContent = "";
      $("q-empty").hidden = STATE.all.length > 0;
      if (STATE.all.length) more(); else $("q-count").textContent = "";
      window.scrollTo(0, 0);
    }).catch(function (e) { UI.say($("page-msg"), e.message, "bad"); $("q-count").textContent = ""; });
  }

  function pickScreen(r) {
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
    $("loading").hidden = true; $("ex-wrap").hidden = false; $("pick").hidden = false; $("run").hidden = true; $("retry").hidden = true;
  }

  function load() {
    $("loading").hidden = false; $("ex-wrap").hidden = true; $("retry").hidden = true; UI.clear($("page-msg"));
    Api.exercises.options().then(pickScreen).catch(function (e) { $("loading").hidden = true; UI.say($("page-msg"), /was not found/.test(e.message || "") ? "Exercises are not switched on yet. Please try again later." : e.message, "bad"); $("retry").hidden = false; });
  }
  $("retry").addEventListener("click", load);
  $("more").addEventListener("click", more);
  $("back").addEventListener("click", function () { $("run").hidden = true; $("pick").hidden = false; $("q-list").textContent = ""; window.scrollTo(0, 0); });
  var cached = Storage.getProfile(); if (cached) Router.setUser(cached);
  load();
})();
