/* tests.js — the list of tests set for this student's class and section. */
(function () {
  var $ = UI.$;
  if (!Auth.requireSession()) return;
  Router.mountShell("tests");

  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }

  var STATE = {
    in_progress: { label: "In progress", cls: "status--pending" },
    available: { label: "Ready", cls: "status--active" },
    upcoming: { label: "Not open yet", cls: "status--pending" },
    done: { label: "Done", cls: "status--active" },
    closed: { label: "Closed", cls: "status--suspended" }
  };

  function card(t) {
    var st = STATE[t.state] || STATE.closed;
    var c = h("article", "rowcard test");
    var top = h("div", "rowcard__top");
    var left = h("div");
    left.appendChild(h("div", "rowcard__name", t.title));
    left.appendChild(h("div", "small muted", t.chapter));
    top.appendChild(left);
    top.appendChild(h("span", "status " + st.cls, st.label));
    c.appendChild(top);

    var facts = h("div", "test__facts");
    facts.appendChild(h("span", "chip", t.questionCount + " questions"));
    facts.appendChild(h("span", "chip", "⏱ " + t.timeLimitMin + " min"));
    facts.appendChild(h("span", "chip", t.maxAttempts === 1 ? "1 attempt" : t.maxAttempts + " attempts"));
    c.appendChild(facts);
    if (t.topics && t.topics.length) c.appendChild(h("p", "small muted", "Topics: " + t.topics.join(" · ")));

    var when = "";
    if (t.state === "upcoming" && t.opensAt) when = "Opens " + DT.format(t.opensAt);
    else if (t.closesAt && t.state !== "done" && t.state !== "closed") when = "Closes " + DT.format(t.closesAt);
    if (when) c.appendChild(h("p", "small", when));

    if (t.last) {
      var l = t.last;
      var line = t.resultVisible && l.scorePct !== null
        ? "Last result: " + l.correct + " / " + l.total + " (" + l.scorePct + "%)"
        : "Your answers are saved. The result will be shown after the test closes.";
      c.appendChild(h("p", "small test__last", line));
    }

    var actions = h("div", "test__actions");
    if (t.state === "in_progress" || t.state === "available") {
      var a = h("a", "btn btn--small", t.state === "in_progress" ? "Continue test" : (t.attemptsUsed ? "Try again" : "Start test"));
      a.href = "test.html?id=" + encodeURIComponent(t.assessmentId);
      actions.appendChild(a);
    }
    if (t.last && t.resultVisible) {
      var r = h("a", "btn btn--small btn--ghost", "See result");
      r.href = "test.html?result=" + encodeURIComponent(t.last.attemptId);
      actions.appendChild(r);
    } else if (t.last) {
      var r2 = h("a", "btn btn--small btn--ghost", "Saved");
      r2.href = "test.html?result=" + encodeURIComponent(t.last.attemptId);
      actions.appendChild(r2);
    }
    if (actions.childNodes.length) c.appendChild(actions);
    return c;
  }

  function load() {
    $("loading").hidden = false; $("tests-wrap").hidden = true; $("retry").hidden = true; UI.clear($("page-msg"));
    Api.assessments.mine().then(function (r) {
      var list = $("test-list"); list.textContent = "";
      r.assessments.forEach(function (t) { list.appendChild(card(t)); });
      $("none-card").hidden = r.assessments.length > 0;
      $("loading").hidden = true; $("tests-wrap").hidden = false;
    }).catch(function (e) { $("loading").hidden = true; UI.say($("page-msg"), /was not found/.test(e.message || "") ? "Tests are not switched on yet. Please try again later or tell your teacher." : e.message, "bad"); $("retry").hidden = false; });
  }
  $("retry").addEventListener("click", load);
  var cached = Storage.getProfile(); if (cached) Router.setUser(cached);
  load();
})();
