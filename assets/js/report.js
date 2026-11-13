/* report.js — Weekly report (Step 9.4).
   Shows the child's weekly reports (newest first, the newest one open), and for the newest unread one the "I have read the report" button.
   The button only works after the child has scrolled to the END of the report (an end marker has been on screen).
   The report is made by the system on Friday 5:00 PM (backend: WeeklyReports.gs). From Saturday 00:00 the backend refuses every other
   request until this button is pressed; api.js then sends the child here (report.html?locked=1). Nothing here is ever built with innerHTML,
   and bar widths are set through the CSSOM (the strict CSP forbids style="" attributes). */
(function () {
  var $ = UI.$;
  if (!Auth.requireSession()) return;
  Router.mountShell("report");

  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var state = { wasLocked: false, rules: null };

  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function add(parent) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]); return parent; }
  function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function clampPct(p) { return Math.max(0, Math.min(100, Math.round(num(p)))); }
  function band(p) { return p >= 60 ? "" : (p >= 40 ? " bar--mid" : " bar--low"); }

  var LABEL = { "Excellent": ["status--active", "excellent"], "Good": ["status--active", "good"], "Needs improvement": ["status--pending", "mid"], "Needs attention": ["status--suspended", "low"] };

  /* ---------- small building blocks ---------- */

  function bar(label, valueText, pct) {
    var b = h("div", "bar" + (pct === null ? "" : band(pct)));
    var top = h("div", "bar__top");
    add(top, h("span", "bar__l", label), h("span", "bar__v", valueText));
    var track = h("div", "bar__track"), fill = h("div", "bar__fill");
    fill.style.width = clampPct(pct) + "%";
    track.appendChild(fill);
    return add(b, top, track);
  }

  function section(title) { var s = h("section", "rep__sec"); s.appendChild(h("h3", "rep__h", title)); return s; }

  function trendText(r) {
    var d = r.trendDelta === null || r.trendDelta === undefined ? 0 : num(r.trendDelta);
    if (r.trend === "up") return "Up " + plural(d, "point", "points") + " from last week";
    if (r.trend === "down") return "Down " + plural(Math.abs(d), "point", "points") + " from last week";
    if (r.trend === "steady") return "About the same as last week";
    return "First report";
  }

  function dayLabel(date) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || "");
    if (!m) return date || "";
    return DAYS[new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay()];
  }

  /* ---------- the sections of one report ---------- */

  function overall(r, d) {
    var s = section("Your week in one number");
    var row = h("div", "rep__score");
    var lab = LABEL[r.label] || LABEL.Good;
    add(row, h("div", "score score--" + lab[1], clampPct(r.performancePct) + "%"));
    var side = h("div");
    add(side, h("div", "status " + lab[0], r.label), h("div", "small muted rep__trend", trendText(r)));
    row.appendChild(side);
    s.appendChild(row);

    var w = d.weights || (state.rules && state.rules.weights) || {};
    var parts = [
      ["Tests", r.testsPct, w.tests, "no test taken this week"],
      ["Practice accuracy", r.practicePct, w.practice, "no practice questions answered"],
      ["Participation", r.participationPct, w.participation, "no data"]
    ];
    var box = h("div", "rep__parts");
    parts.forEach(function (p) {
      var has = p[1] !== null && p[1] !== undefined;
      var weight = Math.round(num(p[2]));
      box.appendChild(bar(p[0] + (has ? " · counts " + weight + "%" : ""), has ? clampPct(p[1]) + "%" : p[3], has ? p[1] : null));
    });
    s.appendChild(box);
    return s;
  }

  function testsSection(d) {
    var t = d.tests || {}, items = t.items || [];
    var s = section("Tests");
    var taken = num(t.taken), avail = num(t.available);
    s.appendChild(h("p", "rep__line", avail === 0 ? "No test was open for you this week." : "You took " + taken + " of " + plural(avail, "test", "tests") + " this week." + (t.avgPct === null || t.avgPct === undefined ? "" : " Average: " + clampPct(t.avgPct) + "%.")));
    items.forEach(function (i) {
      var it = h("div", "rep__item");
      it.appendChild(bar(i.title || "Test", num(i.marks) + " / " + num(i.total) + " · " + clampPct(i.pct) + "%", num(i.pct)));
      if (i.chapter) it.appendChild(h("div", "small muted", i.chapter));
      if (num(i.pending) > 0) it.appendChild(h("div", "small rep__note", plural(num(i.pending), "written answer was", "written answers were") + " still waiting to be marked at 5:00 PM on Friday, so " + (num(i.pending) === 1 ? "it is" : "they are") + " not counted in this report."));
      s.appendChild(it);
    });
    return s;
  }

  function practiceSection(d) {
    var p = d.practice || {}, chapters = p.chapters || [];
    var s = section("Practice");
    if (!num(p.attempted) && !num(p.solutionsViewed)) { s.appendChild(h("p", "rep__line", "No practice questions this week.")); return s; }
    s.appendChild(h("p", "rep__line", "You answered " + plural(num(p.attempted), "question", "questions") + " and got " + num(p.rightFirstTime) + " right at the first try" +
      (p.accuracyPct === null || p.accuracyPct === undefined ? "" : " (" + clampPct(p.accuracyPct) + "%)") + ". You looked at " + plural(num(p.solutionsViewed), "solution", "solutions") + ". Practice days: " + num(p.days) + "."));
    chapters.forEach(function (c) {
      var a = num(c.attempted);
      var pct = a ? Math.round(num(c.rightFirstTime) * 100 / a) : null;
      var box = h("div", "rep__item");
      box.appendChild(bar(c.chapter || c.ref, a ? num(c.rightFirstTime) + " of " + a + " right first time" : "no question answered", pct));
      if (num(c.solutionsViewed)) box.appendChild(h("div", "small muted", plural(num(c.solutionsViewed), "solution", "solutions") + " viewed"));
      s.appendChild(box);
    });
    return s;
  }

  function exercisesSection(d) {
    var e = d.exercises || {}, chapters = e.chapters || [];
    var s = section("Exercises");
    if (!num(e.solutionsViewed)) { s.appendChild(h("p", "rep__line", "You did not open any exercise solution this week.")); return s; }
    s.appendChild(h("p", "rep__line", "You looked at " + plural(num(e.solutionsViewed), "exercise solution", "exercise solutions") + "."));
    var ul = h("ul", "rep__ul");
    chapters.forEach(function (c) { ul.appendChild(h("li", "", (c.chapter || c.ref) + " — " + num(c.solutionsViewed))); });
    s.appendChild(ul);
    return s;
  }

  function dailySection(d) {
    var days = d.daily || [];
    var s = section("Your days");
    s.appendChild(h("p", "small muted", "Questions answered and solutions viewed on each day (Pakistan time)."));
    var max = 1;
    days.forEach(function (x) { if (num(x.n) > max) max = num(x.n); });
    var box = h("div", "dbars");
    days.forEach(function (x) {
      var col = h("div", "dbars__col");
      var track = h("div", "dbars__track"), fill = h("div", "dbars__bar");
      fill.style.height = (num(x.n) ? Math.max(6, Math.round(num(x.n) * 100 / max)) : 0) + "%";
      track.appendChild(fill);
      add(col, h("div", "dbars__n", String(num(x.n))), track, h("div", "dbars__lab", dayLabel(x.date)));
      box.appendChild(col);
    });
    s.appendChild(box);
    return s;
  }

  function participationSection(r, d) {
    var p = d.participation || {}, t = d.tests || {}, pr = d.practice || {};
    var s = section("Participation");
    s.appendChild(bar("Participation", clampPct(r.participationPct) + "%", num(r.participationPct)));
    var lines = [];
    lines.push(num(t.available) > 0 ? "Tests: you took " + num(t.taken) + " of " + num(t.available) + " (" + clampPct(p.testsPart) + "%)." : "Tests: none were open this week, so they are not counted here.");
    lines.push("Practice days: " + num(pr.days) + " (" + num(p.daysTarget || 3) + " days in a week is full marks).");
    lines.forEach(function (l) { s.appendChild(h("p", "rep__line", l)); });
    return s;
  }

  function howMade() {
    var rules = state.rules || {};
    var w = rules.weights || {}, labels = rules.labels || [];
    var det = h("details", "rep__how");
    det.appendChild(h("summary", "", "How this report is made"));
    var paras = [
      "This is a system-generated report. No teacher writes it. A new one is made every Friday at 5:00 PM (Pakistan time) for the week that has just ended: from the last Friday 5:00 PM to this Friday 5:00 PM.",
      "What is counted: the tests you submitted that week, the practice questions you answered (a question counts as right only if you got it right at your first try), and how often you took part.",
      "Your percentage = Tests " + num(w.tests) + "% + Practice accuracy " + num(w.practice) + "% + Participation " + num(w.participation) + "%. If one of these has nothing in that week (for example no test was open), it is left out and the other parts share its weight.",
      "Participation = the tests you took out of the tests that were open, together with the days you practised (" + num(rules.practiceDaysFull || 3) + " practice days in a week is full marks).",
      "The label: " + labels.map(function (l, i) { return (i === 0 ? l.min + "% and above" : (l.min === 0 ? "below " + labels[i - 1].min + "%" : l.min + "% to " + (labels[i - 1].min - 1) + "%")) + " is " + l.label; }).join(", ") + ".",
      "The arrow compares with last week and shows up or down only when the change is " + num(rules.trendStep || 5) + " points or more.",
      "Everything you do after Friday 5:00 PM goes into next week's report. Written answers that your teacher marks after Friday 5:00 PM are not counted in that week's report."
    ];
    paras.forEach(function (t) { det.appendChild(h("p", "rep__line", t)); });
    return det;
  }

  /* ---------- "I have read the report" ---------- */

  function readNote(read) {
    var box = h("div", "rep__read");
    box.appendChild(h("p", "rep__line", "Marked as read on " + DT.format(read.readAt) + "."));
    if (read.comment) box.appendChild(h("p", "ans__written", "Parent's comment: " + read.comment));
    return box;
  }

  function confirmBox(r) {
    var box = h("div", "rep__confirm");
    var end = h("div", "rep__end small muted", "— End of the report —");
    var lbl = h("label", "", "Comment from your parent (optional)"); lbl.setAttribute("for", "comment");
    var ta = h("textarea", "input input--area"); ta.id = "comment"; ta.maxLength = 300; ta.rows = 3;
    var hint = h("p", "hint", "Scroll down to the end of the report. The button works after that.");
    var btn = h("button", "btn", "I have read the report"); btn.type = "button"; btn.id = "read-btn"; btn.disabled = true;
    var msg = h("div", "", ""); msg.id = "read-msg"; msg.setAttribute("role", "alert"); msg.hidden = true;
    add(box, end, lbl, ta, hint, btn, msg);

    function enable() { btn.disabled = false; hint.textContent = "You have reached the end. Press the button when you and your parent have read the report."; }
    if (typeof IntersectionObserver === "function") {
      var obs = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) if (entries[i].isIntersecting) { enable(); obs.disconnect(); return; }
      });
      obs.observe(end);
    } else { enable(); }

    btn.addEventListener("click", function () {
      UI.clear(msg); UI.busy(btn, true, "Saving…");
      Api.reports.markRead(r.reportId, ta.value).then(function (res) {
        box.textContent = "";
        box.appendChild(readNote({ readAt: res.readAt, comment: res.comment }));
        if (state.wasLocked) {
          var done = h("div", ""); UI.say(done, "Thank you. The other tabs are open now. Taking you to the Home page…", "ok");
          box.appendChild(done);
          setTimeout(function () { window.location.replace("dashboard.html"); }, 1200);
        }
        var tag = document.querySelector(".acc--latest .acc__unread"); if (tag) tag.hidden = true;
        $("lock-banner").hidden = true;
      }).catch(function (e) { UI.busy(btn, false); UI.say(msg, e.message, "bad"); });
    });
    return box;
  }

  /* ---------- one report = one accordion card ---------- */

  function card(r, isLatest, idx) {
    var d = r.data || {};
    var lab = LABEL[r.label] || LABEL.Good;
    var art = h("article", "rowcard acc" + (isLatest ? " acc--latest" : ""));
    art.setAttribute("data-report", r.reportId);

    var head = h("button", "acc__head"); head.type = "button";
    var bodyId = "rep-body-" + idx;
    head.setAttribute("aria-controls", bodyId);
    var left = h("div", "acc__title");
    add(left, h("div", "rowcard__name", "Week ending " + DT.dateOnly(r.periodEnd)), h("div", "small muted", trendText(r)));
    var right = h("div", "acc__right");
    var unread = h("span", "status status--pending acc__unread", "Not read yet"); unread.hidden = !!r.read;
    add(right, unread, h("span", "score score--small score--" + lab[1], clampPct(r.performancePct) + "%"), h("span", "status " + lab[0], r.label));
    add(head, left, right);

    var body = h("div", "acc__body"); body.id = bodyId;
    add(body, overall(r, d), testsSection(d), practiceSection(d), exercisesSection(d), dailySection(d), participationSection(r, d));
    body.appendChild(h("p", "small muted rep__foot", "System-generated report · made " + DT.format(r.generatedAt) + " · covers " + DT.dateOnly(r.periodStart) + " to " + DT.dateOnly(r.periodEnd) + "."));
    body.appendChild(howMade());
    if (r.read) body.appendChild(readNote(r.read));
    else if (isLatest) body.appendChild(confirmBox(r));

    function setOpen(on) { head.setAttribute("aria-expanded", on ? "true" : "false"); body.hidden = !on; art.classList.toggle("is-open", on); }
    head.addEventListener("click", function () { setOpen(body.hidden); });
    setOpen(isLatest);
    return add(art, head, body);
  }

  function show(data) {
    state.rules = data.rules || null;
    state.wasLocked = !!(data.lock && data.lock.locked) || /[?&]locked=1\b/.test(window.location.search);
    $("lock-banner").hidden = !(data.lock && data.lock.locked);
    var list = $("report-list"); list.textContent = "";
    var reports = data.reports || [];
    reports.forEach(function (r, i) { list.appendChild(card(r, i === 0, i)); });
    $("none-card").hidden = reports.length > 0;
    UI.fillIcons(document);
    $("loading").hidden = true; $("report-wrap").hidden = false;
  }

  function load() {
    $("loading").hidden = false; $("report-wrap").hidden = true; $("retry").hidden = true; UI.clear($("page-msg"));
    Api.reports.mine().then(show).catch(function (e) {
      $("loading").hidden = true;
      UI.say($("page-msg"), /was not found/.test(e.message || "") ? "Weekly reports are not switched on yet. Please try again later." : e.message, "bad");
      $("retry").hidden = false;
    });
  }
  $("retry").addEventListener("click", load);
  var cached = Storage.getProfile(); if (cached) Router.setUser(cached);
  load();
})();
