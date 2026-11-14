/* practice.js — Practice: pick a chapter (and topic), then answer questions for fun and revision. NOT marked.
   The hint, the answer and the written solution arrive with the question, so every check happens in the browser.
   Only COUNTS are saved (activity.js): questions tried, right at the first try, solutions opened. What the child types is never saved or sent.
   Server text is only ever inserted as text (TeX.set for formulas). */
(function () {
  var $ = UI.$;
  if (!Auth.requireSession()) return;
  Router.mountShell("practice");

  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  var PAGE = Pager.PAGE, PG = null, OPT = null, CUR = "";   // CUR = the chapter code that is open
  var TYPE_LABEL = { mcq: "Choose one", tf: "True / False", fill: "Fill in", short: "Short answer", long: "Long answer", order: "Put in order" };

  /* ---- answer checking (same idea as the server: ignore case and spaces, 0.50 = 0.5) ---- */
  function norm(s) {
    var t = String(s == null ? "" : s).trim().toLowerCase().replace(/\s+/g, "").replace(/,/g, "");
    if (/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)) { var n = Number(t); if (isFinite(n)) return String(Math.round(n * 1e9) / 1e9); }
    return t;
  }
  function fillOk(q, v) { var x = norm(v); if (!x) return false; return [q.answer].concat(q.acceptedAnswers || []).some(function (a) { return norm(a) === x; }); }

  /* ---- one question card ---- */
  function card(q, no) {
    var c = h("article", "card pq");
    var tried = false, viewed = false, ref = CUR;   // counted once per question
    function attempt(ok) {   // the FIRST real check of this question; right first time only if the solution was not opened before
      if (tried) return; tried = true;
      Activity.note("practice", ref, "attempted");
      if (ok && !viewed) Activity.note("practice", ref, "rightFirstTime");
    }
    var chips = h("div", "qcard__chips");
    chips.appendChild(h("span", "chip", "Q" + no));
    chips.appendChild(h("span", "chip chip--" + q.difficulty, q.difficulty));
    chips.appendChild(h("span", "chip", q.topic));
    chips.appendChild(h("span", "chip chip--id", q.questionId));
    c.appendChild(chips);
    var qt = h("div", "qtext"); TeX.set(qt, q.question); c.appendChild(qt);

    var verdict = h("div", "pq__verdict"); verdict.setAttribute("role", "status"); verdict.setAttribute("aria-live", "polite"); verdict.hidden = true;
    function say(ok, text) { verdict.hidden = false; verdict.className = "pq__verdict notice " + (ok ? "notice--ok" : "notice--bad"); verdict.textContent = text; }

    var reveal = h("div", "pq__reveal"); reveal.hidden = true;
    function showAnswer() {
      if (!reveal.firstChild) {
        var a = h("p", "pq__ans"); a.appendChild(h("b", "", "Answer: "));
        var span = h("span"); span.textContent = ""; a.appendChild(span);
        var text = q.answer;
        if (q.type === "mcq") { var o = q.options.filter(function (x) { return x.key === q.answer; })[0]; text = q.answer + (o ? ") " + o.text : ""); }
        else if (q.type === "tf") text = q.answer === "true" ? "True" : "False";
        else if (q.type === "order") text = q.answer.split("|").join("  →  ");
        TeX.set(span, text); reveal.appendChild(a);
        var s = h("div", "ans__why"); s.appendChild(h("b", "", "Solution: ")); var st = h("span", "ans__written"); TeX.set(st, q.solution); s.appendChild(st); reveal.appendChild(s);
      }
      reveal.hidden = false;
    }

    /* the answer area, by type */
    var area = h("div", "pq__area");
    if (q.type === "mcq") {
      var opts = h("div", "opts");
      q.options.forEach(function (o) {
        var b = h("button", "opt"); b.type = "button";
        b.appendChild(h("span", "opt__l", o.key)); var t = h("span", "opt__t"); TeX.set(t, o.text); b.appendChild(t);
        b.addEventListener("click", function () {
          attempt(o.key === q.answer);
          if (o.key === q.answer) { b.classList.add("is-right"); say(true, "Correct! Shabash."); showAnswer(); }
          else { b.classList.add("is-wrong"); b.disabled = true; say(false, "Not this one. Try another option, or open the hint."); }
        });
        opts.appendChild(b);
      });
      area.appendChild(opts);
    } else if (q.type === "tf") {
      var row = h("div", "opts opts--row");
      [["true", "True"], ["false", "False"]].forEach(function (p) {
        var b = h("button", "opt"); b.type = "button"; b.textContent = p[1];
        b.addEventListener("click", function () {
          attempt(p[0] === q.answer);
          if (p[0] === q.answer) { b.classList.add("is-right"); say(true, "Correct! Shabash."); showAnswer(); }
          else { b.classList.add("is-wrong"); b.disabled = true; say(false, "Not this one. Think again."); }
        });
        row.appendChild(b);
      });
      area.appendChild(row);
    } else if (q.type === "fill") {
      var inp = h("input", "input input--answer"); inp.type = "text"; inp.maxLength = 60; inp.autocomplete = "off"; inp.setAttribute("aria-label", "Your answer"); inp.placeholder = "Your answer";
      var chk = h("button", "btn btn--small", "Check my answer"); chk.type = "button";
      function go() {
        if (!inp.value.trim()) { say(false, "Type your answer first."); return; }
        attempt(fillOk(q, inp.value));
        if (fillOk(q, inp.value)) { say(true, "Correct! Shabash."); showAnswer(); } else say(false, "Not yet. Look again, or open the hint.");
      }
      chk.addEventListener("click", go); inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); go(); } });
      area.appendChild(inp); var w = h("div", "actions"); w.appendChild(chk); area.appendChild(w);
    } else if (q.type === "order") {
      var steps = q.items.some(function (it) { return String(it).length > 22; });   // long pieces (solution steps) go one under the other
      var picked = [], slots = h("ol", "slots" + (steps ? " slots--steps" : "")), pool = h("div", "chips2" + (steps ? " chips2--steps" : "")), act = h("div", "actions");
      var back = h("button", "btn btn--small btn--ghost", "Undo"); back.type = "button";
      var check = h("button", "btn btn--small", "Check order"); check.type = "button";
      function draw() {
        slots.textContent = ""; pool.textContent = "";
        q.items.forEach(function (_, i) {
          var li = h("li", "slot" + (picked[i] !== undefined ? " is-filled" : "")); if (picked[i] !== undefined) { var sp = h("span", "slot__b"); TeX.set(sp, picked[i]); li.appendChild(sp); } else li.textContent = String(i + 1);
          slots.appendChild(li);
        });
        q.items.forEach(function (it) {
          var used = picked.indexOf(it) !== -1, b = h("button", "chipbtn chipbtn--big" + (used ? " is-used" : "")); b.type = "button"; TeX.set(b, it); b.disabled = used;
          b.addEventListener("click", function () { picked.push(it); verdict.hidden = true; draw(); });
          pool.appendChild(b);
        });
      }
      back.addEventListener("click", function () { picked.pop(); verdict.hidden = true; draw(); });
      check.addEventListener("click", function () {
        if (picked.length < q.items.length) { say(false, "Tap all the pieces first."); return; }
        attempt(picked.join("|") === q.answer);
        if (picked.join("|") === q.answer) { say(true, "Correct order! Shabash."); showAnswer(); } else say(false, "Not the right order yet. Tap Undo and try again.");
      });
      act.appendChild(back); act.appendChild(check);
      area.appendChild(slots); area.appendChild(pool); area.appendChild(act); draw();
    } else {   // short / long: the child writes on paper or here, then compares with the answer
      var ta = h("textarea", "input input--written"); ta.rows = q.type === "long" ? 5 : 3; ta.maxLength = 1500; ta.setAttribute("aria-label", "Your own answer (optional, only for you)"); ta.placeholder = "Write your own answer here (only for you, it is not saved or sent), then tap “Show answer”.";
      area.appendChild(ta);
    }
    c.appendChild(area); c.appendChild(verdict);

    /* helpers: hint, answer + solution, ask teacher */
    var bar = h("div", "actions");
    if (q.hint) {
      var hb = h("button", "btn btn--small btn--ghost", "Hint"); hb.type = "button"; hb.setAttribute("aria-expanded", "false");
      var hint = h("div", "notice notice--info pq__hint"); hint.hidden = true; TeX.set(hint, q.hint);
      hb.addEventListener("click", function () { hint.hidden = !hint.hidden; hb.setAttribute("aria-expanded", hint.hidden ? "false" : "true"); });
      bar.appendChild(hb); c.appendChild(bar); c.appendChild(hint);
    } else c.appendChild(bar);
    var sb = h("button", "btn btn--small btn--ghost", "Show answer & solution"); sb.type = "button";
    sb.addEventListener("click", function () { if (!viewed) { viewed = true; Activity.note("practice", ref, "solutionsViewed"); } showAnswer(); });   // only the child's own tap counts, not the answer that opens after a right answer
    bar.appendChild(sb);
    c.appendChild(reveal);
    c.appendChild(Ask.helpButton({ questionId: q.questionId }, ""));
    return c;
  }

  /* ---- pages ---- */
  function openChapter(ch, topic) {
    if (PG) PG.destroy();
    CUR = ch.chapterRef;
    $("pick").hidden = true; $("run").hidden = false; UI.clear($("page-msg"));
    $("run-title").textContent = ch.chapter + (topic ? " — " + topic : "");
    PG = Pager.create({
      listEl: $("q-list"), moreEl: $("more"), countEl: $("q-count"), emptyEl: $("q-empty"), pageSize: PAGE,
      cache: Pager.pageCache(OPT, "p|" + ch.chapterRef + "|" + (topic || ""), PAGE),
      idOf: function (q) { return q.questionId; },
      render: card,
      fetch: function (offset, limit) {
        return Api.practice.list(ch.chapterRef, topic || "", { offset: offset, limit: limit }).then(function (r) {
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
      var top = h("div", "rowcard__top"), left = h("div");
      left.appendChild(h("div", "rowcard__name", ch.chapter)); left.appendChild(h("div", "small muted", ch.total + " question" + (ch.total === 1 ? "" : "s")));
      top.appendChild(left); c.appendChild(top);
      var all = h("button", "btn btn--small", "Practice this chapter"); all.type = "button"; all.addEventListener("click", function () { openChapter(ch, ""); });
      var acts = h("div", "actions"); acts.appendChild(all); c.appendChild(acts);
      if (ch.topics.length > 1) {
        c.appendChild(h("p", "small muted", "Or pick one topic:"));
        var chips = h("div", "chips2");
        ch.topics.forEach(function (t) {
          var b = h("button", "chipbtn", t.topic + " (" + t.count + ")"); b.type = "button"; b.addEventListener("click", function () { openChapter(ch, t.topic); }); chips.appendChild(b);
        });
        c.appendChild(chips);
      }
      box.appendChild(c);
    });
    $("none-card").hidden = (r.chapters || []).length > 0;
    $("loading").hidden = true; $("practice-wrap").hidden = false; $("retry").hidden = true;
    if (!isRefresh) { $("pick").hidden = false; $("run").hidden = true; }   // a quiet refresh must never pull the child out of a chapter
  }

  function load() {
    $("loading").hidden = false; $("practice-wrap").hidden = true; $("retry").hidden = true; UI.clear($("page-msg"));
    OPT = Pager.options("practice", function () { return Api.practice.options(); }, pickScreen, function (e) {
      $("loading").hidden = true; UI.say($("page-msg"), /was not found/.test(e.message || "") ? "Practice is not switched on yet. Please try again later." : e.message, "bad"); $("retry").hidden = false;
    });
  }
  $("retry").addEventListener("click", load);
  $("back").addEventListener("click", function () { Activity.flush(false); if (PG) PG.destroy(); PG = null; UI.clear($("page-msg")); $("run").hidden = true; $("pick").hidden = false; $("q-list").textContent = ""; window.scrollTo(0, 0); });
  var cached = Storage.getProfile(); if (cached) Router.setUser(cached);
  load();
})();
