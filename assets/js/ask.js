/* ask.js — the two things a student can ask on a test result (Update 8 step 5):
     Ask.helpButton(answer, attemptId)  "Samajh nahi aya" on ONE question, with an optional note
     Ask.recheckCard(res)               "Please recheck my result": the whole test or the questions I tick, and why
   Everything is built with textContent; the server checks every rule again (one open request per question, 10 open at most ...). */
(function () {
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  var UI_ = window.UI;

  function sent(box, text) {
    box.textContent = "";
    var n = h("p", "notice notice--ok", text + " ");
    var a = h("a", "", "See replies"); a.href = "help.html"; n.appendChild(a); box.appendChild(n);
  }

  function helpButton(a, attemptId) {
    var box = h("div", "ask");
    if (!a || !a.questionId) return box;
    var open = h("button", "linkbtn", "Samajh nahi aya? Ask my teacher"); open.type = "button"; open.setAttribute("aria-expanded", "false");
    var form = h("div", "ask__form"); form.hidden = true;
    var ta = h("textarea", "input input--written"); ta.rows = 3; ta.maxLength = 300; ta.setAttribute("aria-label", "What did you not understand? (optional)");
    ta.placeholder = "What did you not understand? (optional)";
    var msg = h("div"); msg.setAttribute("role", "alert"); msg.hidden = true;
    var send = h("button", "btn btn--small", "Send to my teacher"); send.type = "button";
    form.appendChild(ta); form.appendChild(msg); form.appendChild(send);
    open.addEventListener("click", function () { form.hidden = !form.hidden; open.setAttribute("aria-expanded", form.hidden ? "false" : "true"); if (!form.hidden) ta.focus(); });
    send.addEventListener("click", function () {
      UI_.clear(msg); UI_.busy(send, true, "Sending…");
      Api.requests.create({ type: "help", questionId: a.questionId, attemptId: attemptId || "", note: ta.value.trim() }).then(function () {
        sent(box, "Sent. Your teacher will reply here soon.");
      }).catch(function (e) { UI_.busy(send, false); UI_.say(msg, e.message, "bad"); });
    });
    box.appendChild(open); box.appendChild(form);
    return box;
  }

  function recheckCard(res) {
    var card = h("div", "card");
    card.appendChild(h("h2", "", "Do you think a mark is wrong?"));
    card.appendChild(h("p", "small muted", "You can ask your teacher to check your result again. Tell the teacher why. Your teacher will reply under Help & requests, and you will see your old and new marks."));
    var open = h("button", "btn btn--ghost btn--small", "Ask for a recheck"); open.type = "button"; open.setAttribute("aria-expanded", "false");
    var form = h("div", "ask__form"); form.hidden = true;
    form.appendChild(h("div", "label", "Which questions? (leave all unticked to recheck the whole test)"));
    var list = h("div", "checks");
    (res.answers || []).forEach(function (a, i) {
      var l = h("label", "check check--inline"), c = h("input"); c.type = "checkbox"; c.value = a.questionId; c.name = "rc-q";
      l.appendChild(c); l.appendChild(h("span", "", "Q" + (i + 1))); list.appendChild(l);
    });
    form.appendChild(list);
    var ta = h("textarea", "input input--written"); ta.rows = 4; ta.maxLength = 500; ta.setAttribute("aria-label", "Why do you want a recheck?"); ta.placeholder = "Why do you want a recheck? (required)";
    form.appendChild(ta);
    var msg = h("div"); msg.setAttribute("role", "alert"); msg.hidden = true; form.appendChild(msg);
    var send = h("button", "btn btn--small", "Send recheck request"); send.type = "button"; form.appendChild(send);
    open.addEventListener("click", function () { form.hidden = !form.hidden; open.setAttribute("aria-expanded", form.hidden ? "false" : "true"); });
    send.addEventListener("click", function () {
      UI_.clear(msg);
      var ids = Array.prototype.map.call(form.querySelectorAll('input[name="rc-q"]:checked'), function (c) { return c.value; });
      if (ta.value.trim().length < 5) { UI_.say(msg, "Please write why you want a recheck (at least 5 letters).", "bad"); return; }
      UI_.busy(send, true, "Sending…");
      Api.requests.create({ type: "recheck", attemptId: res.attemptId, questionIds: ids, reason: ta.value.trim() }).then(function () {
        card.textContent = ""; card.appendChild(h("h2", "", "Do you think a mark is wrong?")); sent(card, "Sent. Your teacher will check and reply.");
      }).catch(function (e) { UI_.busy(send, false); UI_.say(msg, e.message, "bad"); });
    });
    card.appendChild(open); card.appendChild(form);
    return card;
  }

  window.Ask = { helpButton: helpButton, recheckCard: recheckCard };
})();
