/* register.js — the one registration form. Checks the same rules as the backend so mistakes are
   caught before sending; the backend checks everything again. */
(function () {
  var $ = UI.$;
  var CFG = window.APS_CONFIG;

  // Names: letters in any language, spaces, . ' -   (older phones fall back to plain Latin letters)
  var NAME_RE;
  try { NAME_RE = new RegExp("^[\\p{L}\\p{M}][\\p{L}\\p{M} .'\\-]*$", "u"); }
  catch (e) { NAME_RE = /^[A-Za-z][A-Za-z .'\-]*$/; }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // Class list comes from config.js, not from the HTML.
  $("classLevel").innerHTML = '<option value="">Select class</option>' +
    CFG.CLASSES.map(function (c) { return '<option value="' + UI.esc(c) + '">Class ' + UI.esc(c) + "</option>"; }).join("");

  function nameError(value, label) {
    var v = String(value).replace(/\s+/g, " ").trim();
    if (v.length < 2) return label + " is required.";
    if (v.length > 80) return label + " is too long.";
    if (!NAME_RE.test(v)) return label + " can have only letters, spaces and . ' -";
    return null;
  }

  $("reg-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var msg = $("reg-msg");
    UI.clear(msg);

    var data = {
      studentName: $("studentName").value.replace(/\s+/g, " ").trim(),
      fatherName: $("fatherName").value.replace(/\s+/g, " ").trim(),
      fatherOccupation: $("fatherOccupation").value.replace(/\s+/g, " ").trim(),
      email: $("email").value.trim().toLowerCase(),
      classLevel: Number($("classLevel").value),
      section: $("section").value.trim().toUpperCase(),
      consent: $("consent").checked,
      website: $("website").value          // bot trap: people leave it empty
    };

    var problem = nameError(data.studentName, "Student's name") || nameError(data.fatherName, "Father's name");
    if (!problem && data.fatherOccupation.length < 2) problem = "Father's occupation is required.";
    if (!problem && data.fatherOccupation.length > 80) problem = "Father's occupation is too long.";
    if (!problem && !EMAIL_RE.test(data.email)) problem = "Please type a correct email address.";
    if (!problem && data.email !== $("email2").value.trim().toLowerCase()) problem = "The two email addresses are not the same.";
    if (!problem && CFG.CLASSES.indexOf(data.classLevel) === -1) problem = "Please select the class.";
    if (!problem && data.section && !/^[A-Za-z0-9]{1,4}$/.test(data.section)) problem = "Section can be 1 to 4 letters or digits.";
    if (!problem && !data.consent) problem = "Please tick the box to confirm the parent/guardian agrees.";
    if (problem) { UI.say(msg, problem, "bad"); return; }

    UI.busy($("reg-btn"), true, "Sending…");
    Api.student.register(data).then(function (reply) {
      $("reg-card").hidden = true;
      $("done-card").hidden = false;
      UI.say($("done-msg"), (reply && reply.message) || "Your registration has been received.", "ok");
      window.scrollTo(0, 0);
    }).catch(function (e) {
      UI.busy($("reg-btn"), false);
      UI.say(msg, e.message, "bad");
    });
  });
})();
