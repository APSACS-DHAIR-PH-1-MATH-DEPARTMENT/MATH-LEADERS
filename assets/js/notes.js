/* notes.js — Teacher's notes: only the notes a teacher chose to show this student (copy checks and remarks). Read only. */
(function () {
  var $ = UI.$;
  if (!Auth.requireSession()) return;
  Router.mountShell("notes");

  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  var STATUS = {
    checked: ["Copy checked — well done", "status--active"],
    incomplete: ["Copy incomplete", "status--pending"],
    absent: ["Absent on the day", "status--archived"],
    not_received: ["Copy not received", "status--suspended"],
    other: ["Copy check", "status--archived"]
  };

  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function dateText(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ""); return m ? Number(m[3]) + " " + MON[Number(m[2]) - 1] + " " + m[1] : (d || ""); }

  function card(n) {
    var c = h("article", "rowcard");
    var top = h("div", "rowcard__top"), left = h("div");
    var st = n.kind === "copy" ? (STATUS[n.status] || STATUS.other) : ["Teacher's remark", "status--active"];
    left.appendChild(h("div", "rowcard__name", n.kind === "copy" ? "Copy check" : "Remark"));
    left.appendChild(h("div", "small muted", dateText(n.noteDate) + (n.byTeacherName ? " · " + UI.name(n.byTeacherName) : "")));
    top.appendChild(left); top.appendChild(h("span", "status " + st[1], st[0])); c.appendChild(top);
    if (n.text) c.appendChild(h("p", "ans__written", n.text));
    return c;
  }

  function load() {
    $("loading").hidden = false; $("notes-wrap").hidden = true; $("retry").hidden = true; UI.clear($("page-msg"));
    Api.remarks.mine().then(function (r) {
      var list = $("note-list"); list.textContent = "";
      (r.notes || []).forEach(function (n) { list.appendChild(card(n)); });
      $("none-card").hidden = (r.notes || []).length > 0;
      $("loading").hidden = true; $("notes-wrap").hidden = false;
    }).catch(function (e) { $("loading").hidden = true; UI.say($("page-msg"), /was not found/.test(e.message || "") ? "Teacher's notes are not switched on yet. Please try again later." : e.message, "bad"); $("retry").hidden = false; });
  }
  $("retry").addEventListener("click", load);
  var cached = Storage.getProfile(); if (cached) Router.setUser(cached);
  load();
})();
