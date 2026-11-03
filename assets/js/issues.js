/* issues.js — the student's own disciplinary issues (read only): what happened, when, and what was done about it. */
(function () {
  var $ = UI.$;
  if (!Auth.requireSession()) return;
  Router.mountShell("issues");

  var SEV = { minor: "Minor", moderate: "Moderate", serious: "Serious" };

  function actionHtml(a) {
    return '<li class="tl__item"><div class="tl__head"><span class="chip ' + (a.takenBy === "school" ? "chip--gold" : "") + '">' + (a.takenBy === "school" ? "School" : "Teacher") + "</span> <b>" + UI.esc(a.actionType) + "</b></div>" +
      (a.note ? '<div class="tl__note">' + UI.esc(a.note) + "</div>" : "") +
      '<div class="small muted">' + UI.esc(DT.format(a.takenAt)) + " · " + UI.esc(a.actorName) + "</div></li>";
  }

  function issueHtml(i) {
    var open = i.status === "open";
    return '<article class="issue issue--' + UI.esc(i.severity) + '">' +
      '<div class="rowcard__top"><div><div class="rowcard__name">' + UI.esc(i.title) + '</div><div class="small muted">' + UI.esc(i.category) + " · " + UI.esc(SEV[i.severity] || i.severity) + "</div></div>" +
      '<span class="status status--' + (open ? "pending" : "active") + '">' + (open ? "Open" : "Resolved") + "</span></div>" +
      '<div class="issue__when"><b>When:</b> ' + UI.esc(DT.format(i.occurredAt)) + '<br><span class="small muted">Noted by ' + UI.esc(i.reportedByName) + (!open && i.resolvedAt ? " · resolved " + UI.esc(DT.format(i.resolvedAt)) : "") + "</span></div>" +
      (i.description ? '<p class="issue__desc">' + UI.esc(i.description) + "</p>" : "") +
      '<div class="label">What was done</div>' +
      (i.actions.length ? '<ol class="tl">' + i.actions.map(actionHtml).join("") + "</ol>" : '<p class="small muted">No action has been recorded yet.</p>') +
      "</article>";
  }

  function load() {
    $("loading").hidden = false; $("issues-wrap").hidden = true; $("retry").hidden = true; UI.clear($("page-msg"));
    Api.issues.mine().then(function (r) {
      $("n-open").textContent = r.openCount; $("n-total").textContent = r.total;
      $("none-card").hidden = r.issues.length > 0;
      $("issue-list").innerHTML = r.issues.map(issueHtml).join("");
      $("loading").hidden = true; $("issues-wrap").hidden = false;
    }).catch(function (e) { $("loading").hidden = true; UI.say($("page-msg"), e.message, "bad"); $("retry").hidden = false; });
  }
  $("retry").addEventListener("click", load);
  var cached = Storage.getProfile(); if (cached) Router.setUser(cached);
  load();
})();
