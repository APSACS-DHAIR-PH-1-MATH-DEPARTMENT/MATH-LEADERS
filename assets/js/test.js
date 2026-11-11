/* test.js — one diagnostic test, start to finish: rules -> questions with a countdown -> review -> result.
   RULES OF THIS PAGE
   - The browser never marks anything. It sends the answers; the server marks them and sends the result back.
   - The clock is the SERVER's: deadline = start time + limit. The countdown here only displays it (corrected for the
     difference between this phone's clock and the server's clock).
   - Answers are kept on THIS device while you work (localStorage), so a refresh or a dropped connection loses nothing.
     If the time runs out the page submits for you; if the connection is down it keeps trying when you press the button.
   - Question text is always inserted as TEXT (TeX.set); formulas are drawn by KaTeX. Nothing from the server is ever
     inserted as HTML. */
(function () {
  var $ = UI.$;
  if (!Auth.requireSession()) return;
  Router.mountShell("tests");

  var query = (function () {
    var out = {}, s = (location.search || "").replace(/^\?/, "");
    s.split("&").forEach(function (p) { if (!p) return; var i = p.indexOf("="); out[decodeURIComponent(i < 0 ? p : p.slice(0, i))] = i < 0 ? "" : decodeURIComponent(p.slice(i + 1)); });
    return out;
  })();

  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function tex(tag, cls, text) { var e = h(tag, cls); TeX.set(e, text); return e; }
  function show(id) {
    ["v-intro", "v-run", "v-review", "v-result"].forEach(function (v) { $(v).hidden = v !== id; });
    $("loading").hidden = true;
    window.scrollTo(0, 0);
  }
  function fail(e) { $("loading").hidden = true; UI.say($("page-msg"), e.message || String(e), "bad"); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /* ---------- local progress (never fatal if storage is blocked) ---------- */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }

  var S = { att: null, qs: [], answers: {}, times: {}, idx: 0, enter: 0, endMs: 0, tick: 0, busy: false, done: false, warned5: false, warned1: false, timeUp: false };

  function key() { return "aps:test:" + S.att.attemptId; }
  function save() { lsSet(key(), JSON.stringify({ a: S.answers, t: S.times, i: S.idx })); }
  function restore() {
    var raw = lsGet(key()); if (!raw) return;
    try {
      var d = JSON.parse(raw), ids = {};
      S.qs.forEach(function (q) { ids[q.questionId] = true; });
      Object.keys(d.a || {}).forEach(function (k) { if (ids[k]) S.answers[k] = d.a[k]; });
      Object.keys(d.t || {}).forEach(function (k) { if (ids[k]) S.times[k] = Number(d.t[k]) || 0; });
      if (typeof d.i === "number" && d.i >= 0 && d.i < S.qs.length) S.idx = d.i;
    } catch (e) { /* ignore a damaged copy */ }
  }

  /* ---------- answers ---------- */
  function isAnswered(q) {
    var a = S.answers[q.questionId];
    if (q.type === "order") return Array.isArray(a) && a.length === q.items.length;
    return a !== undefined && a !== null && String(a).trim() !== "";
  }
  function answeredCount() { return S.qs.filter(isAnswered).length; }
  function setAnswer(q, v) {
    var empty = v === "" || v === null || (Array.isArray(v) && v.length === 0);
    if (empty) delete S.answers[q.questionId]; else S.answers[q.questionId] = v;
    save(); refreshChrome();
  }

  /* ---------- timer ---------- */
  function fmt(sec) {
    sec = Math.max(0, sec);
    var hh = Math.floor(sec / 3600), mm = Math.floor((sec % 3600) / 60), ss = sec % 60;
    return (hh ? hh + ":" + pad(mm) : mm) + ":" + pad(ss);
  }
  function note(text, kind) { var n = $("timer-note"); if (!text) { n.hidden = true; return; } UI.say(n, text, kind); }
  function remaining() { return Math.round((S.endMs - Date.now()) / 1000); }
  function onTick() {
    var r = remaining(), t = $("r-timer");
    t.textContent = "⏱ " + fmt(r);
    t.className = "timer" + (r <= 60 ? " timer--danger" : (r <= 300 ? " timer--warn" : ""));
    if (r <= 300 && !S.warned5 && r > 60) { S.warned5 = true; note("5 minutes left. Answer the questions you know first.", "info"); }
    if (r <= 60 && !S.warned1) { S.warned1 = true; note("Only 1 minute left!", "bad"); }
    if (r <= 0 && !S.timeUp) { S.timeUp = true; autoSubmit(); }
  }

  /* ---------- the question screen ---------- */
  var DIFF = { easy: "Easy", medium: "Medium", challenging: "Challenging" };

  function flushTime() {
    if (!S.qs.length || !S.enter) return;
    var q = S.qs[S.idx], add = Math.round((Date.now() - S.enter) / 1000);
    S.times[q.questionId] = (S.times[q.questionId] || 0) + Math.max(0, add);
    S.enter = Date.now();
  }

  function refreshChrome() {
    var n = S.qs.length, a = answeredCount();
    $("r-count").textContent = "Question " + (S.idx + 1) + " of " + n;
    $("r-answered").textContent = a + " of " + n + " answered";
    $("r-fill").style.width = Math.round((a / n) * 100) + "%";
    var cells = $("r-grid").childNodes;
    for (var i = 0; i < cells.length; i++) {
      cells[i].className = "gcell" + (isAnswered(S.qs[i]) ? " is-done" : "") + (i === S.idx ? " is-here" : "");
      cells[i].setAttribute("aria-label", "Question " + (i + 1) + (isAnswered(S.qs[i]) ? ", answered" : ", not answered") + (i === S.idx ? ", current" : ""));
    }
    var q = S.qs[S.idx];
    $("q-clear").hidden = !(S.answers[q.questionId] !== undefined);
    $("r-prev").disabled = S.idx === 0;
    $("r-next").textContent = S.idx === n - 1 ? "Review & submit" : "Next →";
  }

  function renderOptions(q, box) {
    var labels = ["A", "B", "C", "D"];
    var compact = q.options.every(function (o) { return o.text.length <= 3; });   // "<", "=", ">" sit side by side
    var wrap = h("div", "opts" + (compact ? " opts--row" : ""));
    q.options.forEach(function (o, i) {
      var b = h("button", "opt"); b.type = "button";
      b.appendChild(h("span", "opt__l", labels[i]));
      b.appendChild(tex("span", "opt__t", o.text));
      var picked = S.answers[q.questionId] === o.key;
      if (picked) b.className += " is-picked";
      b.setAttribute("aria-pressed", picked ? "true" : "false");
      b.addEventListener("click", function () { setAnswer(q, o.key); renderOptions(q, box); });
      wrap.appendChild(b);
    });
    box.textContent = ""; box.appendChild(wrap);
  }

  function renderFill(q, box) {
    var inp = h("input", "input input--answer");
    inp.type = "text"; inp.id = "ans-fill"; inp.setAttribute("autocomplete", "off"); inp.setAttribute("inputmode", "decimal"); inp.maxLength = 40;
    inp.setAttribute("aria-label", "Your answer"); inp.placeholder = "Type your answer";
    inp.value = S.answers[q.questionId] || "";
    inp.addEventListener("input", function () { setAnswer(q, inp.value.trim() === "" ? "" : inp.value); });
    box.textContent = ""; box.appendChild(inp);
    box.appendChild(h("p", "hint", "Write only the number. Units are not needed."));
  }

  /* Update 8 step 4b: short / long questions. The student writes; the TEACHER marks it later. */
  function renderWritten(q, box) {
    var max = q.type === "long" ? 1500 : 400;
    var ta = h("textarea", "input input--written");
    ta.id = "ans-written"; ta.rows = q.type === "long" ? 9 : 4; ta.maxLength = max;
    ta.setAttribute("aria-label", "Your written answer");
    ta.placeholder = q.type === "long" ? "Write your working and your answer here…" : "Write your answer here…";
    ta.value = S.answers[q.questionId] || "";
    var cnt = h("p", "hint written__count");
    function upd() { cnt.textContent = ta.value.length + " / " + max + " characters"; }
    ta.addEventListener("input", function () { upd(); setAnswer(q, ta.value.trim() === "" ? "" : ta.value); });
    box.textContent = ""; box.appendChild(ta); box.appendChild(cnt);
    box.appendChild(h("p", "hint", "Your teacher will mark this answer after the test. The other questions are marked at once."));
    upd();
  }

  function renderTF(q, box) {
    var wrap = h("div", "opts opts--row");
    [["true", "True"], ["false", "False"]].forEach(function (p) {
      var b = h("button", "opt"); b.type = "button"; b.appendChild(h("span", "opt__t", p[1]));
      var on = S.answers[q.questionId] === p[0];
      if (on) b.className += " is-picked";
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.addEventListener("click", function () { setAnswer(q, p[0]); renderTF(q, box); });
      wrap.appendChild(b);
    });
    box.textContent = ""; box.appendChild(wrap);
  }

  function renderOrder(q, box) {
    var picked = Array.isArray(S.answers[q.questionId]) ? S.answers[q.questionId] : [];
    // items may repeat in value, so track them by their position in q.items
    var used = {};
    picked.forEach(function (it) { for (var i = 0; i < q.items.length; i++) if (q.items[i] === it && !used[i]) { used[i] = true; break; } });
    box.textContent = "";
    box.appendChild(h("p", "hint", "Tap the numbers one by one, in the order asked. Tap a number in your answer to take it back."));
    var pool = h("div", "chips2");
    q.items.forEach(function (it, i) {
      var b = h("button", "chipbtn chipbtn--big" + (used[i] ? " is-used" : "")); b.type = "button"; b.textContent = it; b.disabled = !!used[i];
      b.addEventListener("click", function () { setAnswer(q, picked.concat([it])); renderOrder(q, box); });
      pool.appendChild(b);
    });
    box.appendChild(pool);
    box.appendChild(h("div", "label", "Your order"));
    var slots = h("ol", "slots");
    for (var k = 0; k < q.items.length; k++) {
      var li = h("li", "slot" + (picked[k] !== undefined ? " is-filled" : ""));
      if (picked[k] !== undefined) {
        (function (idx) {
          var b = h("button", "slot__b"); b.type = "button"; b.textContent = picked[idx]; b.setAttribute("aria-label", "Remove " + picked[idx]);
          b.addEventListener("click", function () { var next = picked.slice(); next.splice(idx, 1); setAnswer(q, next); renderOrder(q, box); });
          li.appendChild(b);
        })(k);
      } else { li.textContent = "—"; }
      slots.appendChild(li);
    }
    box.appendChild(slots);
  }

  function showQuestion(i) {
    flushTime();
    S.idx = i; S.enter = Date.now(); save();
    var q = S.qs[i];
    $("q-topic").textContent = q.topic; $("q-id").textContent = q.questionId;   /* build 10: question number for quoting to the teacher */
    var d = $("q-diff"); d.textContent = DIFF[q.difficulty] || q.difficulty; d.className = "chip chip--diff chip--" + q.difficulty;
    TeX.set($("q-text"), q.question);
    var box = $("q-answer");
    var mk = $("q-marks"); if (mk) { mk.textContent = (q.marks || 1) + ((q.marks || 1) === 1 ? " mark" : " marks"); }
    if (q.type === "mcq") renderOptions(q, box); else if (q.type === "fill") renderFill(q, box); else if (q.type === "order") renderOrder(q, box);
    else if (q.type === "short" || q.type === "long") renderWritten(q, box); else renderTF(q, box);
    refreshChrome();
    show("v-run");
  }

  function buildGrid() {
    var g = $("r-grid"); g.textContent = "";
    S.qs.forEach(function (q, i) {
      var b = h("button", "gcell", String(i + 1)); b.type = "button";
      b.addEventListener("click", function () { showQuestion(i); });
      g.appendChild(b);
    });
  }

  /* ---------- review + submit ---------- */
  function showReview() {
    flushTime(); save();
    var n = S.qs.length, a = answeredCount(), missing = n - a;
    $("rv-summary").textContent = missing === 0
      ? "You answered all " + n + " questions. Press Submit when you are ready. You cannot change anything after that."
      : "You answered " + a + " of " + n + " questions. " + missing + " not answered yet. Tap a number to go back to it.";
    var box = $("rv-missing"); box.textContent = "";
    S.qs.forEach(function (q, i) {
      if (isAnswered(q)) return;
      var b = h("button", "gcell", String(i + 1)); b.type = "button"; b.addEventListener("click", function () { showQuestion(i); }); box.appendChild(b);
    });
    UI.clear($("rv-msg"));
    show("v-review");
  }

  function collect() {
    flushTime();
    return S.qs.map(function (q) {
      var a = S.answers[q.questionId];
      if (q.type === "order") a = isAnswered(q) ? a : "";
      return { questionId: q.questionId, answer: a === undefined ? "" : a, timeSec: S.times[q.questionId] || 0 };
    });
  }

  function submit(auto) {
    if (S.busy || S.done) return;
    S.busy = true;
    var btn = $("rv-submit"), msg = $("rv-msg");
    UI.busy(btn, true, "Submitting…");
    if (auto) { show("v-review"); $("rv-summary").textContent = "Time is up. Your answers are being handed in…"; }
    UI.clear(msg);
    Api.assessments.submit(S.att.attemptId, collect()).then(function (res) {
      S.busy = false; UI.busy(btn, false);
      if (res.expired) { finish(); lsDel(key()); showExpired(res.message); return; }
      finish(); lsDel(key());
      renderResult(res);
    }).catch(function (e) {
      S.busy = false; UI.busy(btn, false);
      show("v-review");
      UI.say(msg, (e.message || "Could not submit.") + " Your answers are safe on this phone. Check your internet and press Submit again.", "bad");
    });
  }
  function autoSubmit() { note("Time is up! Handing in your test…", "bad"); submit(true); }

  function finish() {
    S.done = true; clearInterval(S.tick);
    window.removeEventListener("beforeunload", guard);
  }
  function guard(e) { if (S.done) return; e.preventDefault(); e.returnValue = ""; }

  function showExpired(text) {
    var c = $("res-card"); c.textContent = "";
    c.appendChild(h("h2", "", "Time was over"));
    c.appendChild(h("p", "", text || "The time for this test was over, so your answers could not be saved. Please tell your teacher."));
    $("res-more").hidden = true;
    show("v-result");
  }

  /* ---------- result ---------- */
  function barColor(p) { return p < 40 ? "bar--low" : (p < 60 ? "bar--mid" : "bar--high"); }
  function bar(label, correct, total, pct) {
    var row = h("div", "bar " + barColor(pct));
    var top = h("div", "bar__top"); top.appendChild(h("span", "bar__l", label)); top.appendChild(h("span", "bar__v", correct + " / " + total + " · " + pct + "%"));
    var track = h("div", "bar__track"), fill = h("div", "bar__fill"); fill.style.width = Math.max(2, pct) + "%"; track.appendChild(fill);
    row.appendChild(top); row.appendChild(track);
    return row;
  }
  function plain(s) { return String(s == null ? "" : s).replace(/\|/g, " , "); }

  function answerCard(a, i) {
    var kind, label;
    if (a.pending) { kind = "pending"; label = "⏳ Waiting for your teacher to mark"; }
    else if (!a.answered) { kind = "blank"; label = "— Not answered"; }
    else if (a.manual) {
      kind = a.marksAwarded >= a.marks ? "right" : (a.marksAwarded > 0 ? "partial" : "wrong");
      label = kind === "right" ? "✓ Full marks" : (kind === "partial" ? "◐ Partly correct" : "✗ No marks");
    } else { kind = a.isCorrect ? "right" : "wrong"; label = a.isCorrect ? "✓ Correct" : "✗ Not correct"; }
    var c = h("article", "ans ans--" + kind);
    c.setAttribute("data-kind", kind === "partial" ? "wrong" : kind);
    var top = h("div", "ans__top");
    top.appendChild(h("span", "ans__n", "Q" + (i + 1)));
    top.appendChild(h("span", "ans__s", label));
    if (a.manual || a.marks > 1) top.appendChild(h("span", "chip chip--marks", (a.pending ? "" : a.marksAwarded + " / ") + a.marks + (a.marks === 1 ? " mark" : " marks")));
    top.appendChild(h("span", "chip", a.topic));
    if (a.questionId) top.appendChild(h("span", "chip chip--id", a.questionId));
    c.appendChild(top);
    c.appendChild(tex("div", "qtext qtext--sm", a.question || ""));
    var yours = h("div", "ans__line"); yours.appendChild(h("b", "", "Your answer: "));
    if (a.answered) yours.appendChild(a.manual ? h("span", "ans__written", a.givenText) : tex("span", "", plain(a.givenText))); else yours.appendChild(h("span", "muted", "none"));
    c.appendChild(yours);
    if (a.remark) { var rm = h("div", "ans__remark"); rm.appendChild(h("b", "", "Teacher's remark: ")); rm.appendChild(h("span", "", a.remark)); c.appendChild(rm); }
    if (kind !== "right") {
      var right = h("div", "ans__line ans__line--right"); right.appendChild(h("b", "", a.manual ? "Model answer: " : "Right answer: "));
      right.appendChild(a.manual ? h("span", "ans__written", a.correctText) : tex("span", "", plain(a.correctText)));
      c.appendChild(right);
    }
    if (a.explanation) { var ex = h("div", "ans__why"); ex.appendChild(h("b", "", "Why: ")); ex.appendChild(tex("span", "", a.explanation)); c.appendChild(ex); }
    return c;
  }

  function renderResult(res) {
    var c = $("res-card"); c.textContent = "";
    c.appendChild(h("div", "small muted", res.title || "Test"));
    if (!res.submitted) {
      c.appendChild(h("h2", "", res.expired ? "Time was over" : "Not submitted"));
      c.appendChild(h("p", "", res.message || "")); $("res-more").hidden = true; show("v-result"); return;
    }
    if (!res.visible) {
      c.appendChild(h("h2", "", "Your answers are saved"));
      c.appendChild(h("p", "", res.message || "Your teacher will release the result later."));
      $("res-more").hidden = true; show("v-result"); return;
    }
    var at = res.attempt, p = at.scorePct, waiting = at.pendingCount || 0;
    var useMarks = at.marksTotal !== at.total || res.answers.some(function (x) { return x.manual; });
    var head = waiting ? "Test handed in" : (p >= 80 ? "Excellent work!" : (p >= 60 ? "Good effort!" : (p >= 40 ? "Keep practising" : "Let's work on this together")));
    var headIcon = waiting ? "thumb" : (p >= 80 ? "star" : (p >= 60 ? "thumb" : (p >= 40 ? "trend" : "heart")));
    var headEl = h("h2", "", "");
    headEl.innerHTML = UI.icon(headIcon);
    headEl.appendChild(document.createTextNode(" " + head));
    c.appendChild(headEl);
    var big = h("div", "result__score");
    big.appendChild(h("span", "result__n", useMarks ? at.marksObtained + " / " + at.marksTotal + " marks" : at.correct + " / " + at.total));
    big.appendChild(h("span", "result__p", p + "%" + (waiting ? " so far" : "")));
    c.appendChild(big);
    if (waiting) c.appendChild(h("p", "notice notice--info", "⏳ " + waiting + " written answer" + (waiting === 1 ? " is" : "s are") + " waiting for your teacher to mark. The marks above count only what is already marked. Open this result again later to see your final score."));
    var meta = at.answered < at.total ? (at.total - at.answered) + " question(s) were not answered. " : "";
    c.appendChild(h("p", "muted", meta + "Time used: " + fmt(at.timeUsedSec) + (res.late ? " · submitted just after the time limit" : "")));
    if (res.strongest) c.appendChild(h("p", "", "Strongest topic: " + res.strongest + (res.weakest ? " · Needs practice: " + res.weakest : "")));

    var tb = $("res-topics"); tb.textContent = ""; res.topics.forEach(function (t) { tb.appendChild(bar(t.topic, t.correct, t.total, t.pct)); });
    var db = $("res-diff"); db.textContent = ""; res.difficulty.forEach(function (d) { db.appendChild(bar(DIFF[d.difficulty] || d.difficulty, d.correct, d.total, d.pct)); });
    $("res-diff-card").hidden = res.difficulty.length === 0;
    var ad = $("res-advice"); ad.textContent = "";
    res.advice.forEach(function (x) { var li = h("li"); li.appendChild(h("b", "", x.title)); li.appendChild(h("div", "small", x.text)); ad.appendChild(li); });
    var list = $("res-answers"); list.textContent = "";
    res.answers.forEach(function (a, i) { list.appendChild(answerCard(a, i)); });
    applyFilter("all");
    $("res-more").hidden = false;
    show("v-result");
  }

  function applyFilter(f) {
    var cards = $("res-answers").childNodes, i;
    for (i = 0; i < cards.length; i++) cards[i].hidden = !(f === "all" || cards[i].getAttribute("data-kind") === f);
    var btns = $("res-filters").querySelectorAll("button");
    for (i = 0; i < btns.length; i++) btns[i].className = "chipbtn" + (btns[i].getAttribute("data-f") === f ? " is-on" : "");
  }

  /* ---------- starting ---------- */
  function begin(data) {
    S.att = data; S.qs = data.questions; S.answers = {}; S.times = {}; S.idx = 0; S.done = false; S.timeUp = false; S.warned5 = S.warned1 = false;
    var offset = Date.parse(data.serverNow) - Date.now();
    S.endMs = Date.parse(data.deadlineAt) - offset;
    restore();
    buildGrid();
    window.addEventListener("beforeunload", guard);
    clearInterval(S.tick); S.tick = setInterval(onTick, 1000); onTick();
    S.enter = Date.now();
    showQuestion(S.idx);
    if (data.resumed) note("Welcome back. Your earlier answers on this phone were restored.", "info");
  }

  function intro(t) {
    $("i-title").textContent = t.title;
    $("i-chapter").textContent = t.chapter;
    var f = $("i-facts"); f.textContent = "";
    f.appendChild(h("span", "chip", t.questionCount + " questions")); f.appendChild(h("span", "chip", "⏱ " + t.timeLimitMin + " minutes"));
    $("i-topics").textContent = "Topics: " + t.topics.join(" · ");
    $("i-attempts").textContent = t.maxAttempts === 1 ? "You have only one attempt." : "You have " + t.maxAttempts + " attempts in total (" + t.attemptsUsed + " used).";
    var btn = $("i-start"), msg = $("i-msg");
    if (t.state === "in_progress") { btn.textContent = "Continue my test"; $("i-attempts").textContent = "You already started this test. The clock is still running."; }
    else if (t.state === "available") { btn.textContent = "Start test (" + t.timeLimitMin + " min)"; }
    else {
      btn.hidden = true;
      UI.say(msg, t.state === "upcoming" ? "This test opens " + DT.format(t.opensAt) + "." : (t.state === "done" ? "You have finished this test." : "This test is closed."), "info");
    }
    btn.onclick = function () {
      UI.busy(btn, true, "Starting…"); UI.clear(msg);
      Api.assessments.start(t.assessmentId).then(function (data) { UI.busy(btn, false); begin(data); })
        .catch(function (e) { UI.busy(btn, false); UI.say(msg, e.message, "bad"); });
    };
    show("v-intro");
  }

  /* ---------- wiring ---------- */
  $("retry").addEventListener("click", function () { location.reload(); });
  $("r-prev").addEventListener("click", function () { if (S.idx > 0) showQuestion(S.idx - 1); });
  $("r-next").addEventListener("click", function () { if (S.idx < S.qs.length - 1) showQuestion(S.idx + 1); else showReview(); });
  $("q-clear").addEventListener("click", function () { var q = S.qs[S.idx]; setAnswer(q, ""); showQuestion(S.idx); });
  $("r-grid-toggle").addEventListener("click", function () {
    var g = $("r-grid"), open = g.hidden;
    g.hidden = !open; this.textContent = open ? "Hide all questions" : "Show all questions"; this.setAttribute("aria-expanded", open ? "true" : "false");
  });
  $("rv-back").addEventListener("click", function () { showQuestion(Math.min(S.idx, S.qs.length - 1)); });
  $("rv-submit").addEventListener("click", function () { submit(false); });
  $("res-filters").addEventListener("click", function (e) { var f = e.target && e.target.getAttribute && e.target.getAttribute("data-f"); if (f) applyFilter(f); });

  var cached = Storage.getProfile(); if (cached) Router.setUser(cached);

  if (query.result) {
    Api.assessments.result(query.result).then(renderResult).catch(fail);
  } else if (query.id) {
    Api.assessments.mine().then(function (r) {
      var t = r.assessments.filter(function (x) { return x.assessmentId === query.id; })[0];
      if (!t) { fail(new Error("That test was not found for your class.")); return; }
      intro(t);
    }).catch(fail);
  } else {
    location.replace("tests.html");
  }
})();
