/* login.js — one page, three jobs:  Log in  |  First time (set PIN)  |  Forgot PIN.
   First time and Forgot PIN are the same two steps:
     A) Student ID + the new PIN (typed twice)      B) the 6-digit code emailed to the parent
   The PIN is held only in memory between A and B and is sent together with the code. It is never saved. */
(function () {
  var $ = UI.$;
  var mode = "login";            // "login" | "setpin" | "resetpin"
  var cooldownTimer = null;
  var COOLDOWN_SECONDS = 60;
  var held = { id: "", pin: "" };   // memory only

  var params = location.search;
  var wantedMode = (params.match(/[?&]mode=(setpin|resetpin)/) || [])[1];
  var idFromLink = (params.match(/[?&]id=(WHA-STU-\d{7})/i) || [])[1];

  // Already logged in? Go straight to Home (unless they came here on purpose to set/reset the PIN).
  if (!wantedMode && Storage.getToken()) { location.replace("dashboard.html"); return; }

  UI.wirePinToggles(document);
  ["l-pin", "p-code", "p-pin", "p-pin2"].forEach(function (id) { UI.digitsOnly($(id)); });

  if (/[?&]expired=1/.test(params)) UI.say($("page-msg"), "Your session ended. Please log in again.", "info");
  if (/[?&]inactive=1/.test(params)) UI.say($("page-msg"), "This account is not active. Please contact your teacher.", "bad");

  /* ---------- tabs ---------- */
  function showStepA() {
    $("step-pin").hidden = false; $("step-code").hidden = true;
    clearInterval(cooldownTimer); $("p-send").disabled = false; $("p-send").textContent = "Continue — email me a code";
    $("p-code").value = "";
  }

  function setMode(next) {
    mode = next;
    ["login", "setpin", "resetpin"].forEach(function (m) { $("tab-" + m).setAttribute("aria-selected", String(m === mode)); });
    $("panel-login").hidden = mode !== "login";
    $("panel-pin").hidden = mode === "login";
    UI.clear($("login-msg")); UI.clear($("pin-msg")); UI.clear($("page-msg"));
    if (mode === "setpin") {
      $("pin-title").textContent = "Set your PIN";
      $("pin-intro").textContent = "Choose your own 6-digit PIN. Then we email a 6-digit code to the parent to confirm it.";
    } else if (mode === "resetpin") {
      $("pin-title").textContent = "Forgot your PIN?";
      $("pin-intro").textContent = "No problem. Choose a new 6-digit PIN. Then we email a 6-digit code to the parent to confirm it.";
    }
    if (mode !== "login") showStepA();
    var first = mode === "login" ? $("l-id") : ($("p-id").value ? $("p-pin") : $("p-id"));
    if (first) first.focus();
  }
  ["login", "setpin", "resetpin"].forEach(function (m) { $("tab-" + m).addEventListener("click", function () { setMode(m); }); });

  if (idFromLink) { $("p-id").value = idFromLink.toUpperCase(); $("l-id").value = idFromLink.toUpperCase(); }
  if (wantedMode) setMode(wantedMode);

  /* ---------- log in ---------- */
  $("login-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var id = $("l-id").value, pin = $("l-pin").value, msg = $("login-msg");
    UI.clear(msg);
    if (!Auth.isValidStudentId(id)) return UI.say(msg, "Please type your Student ID exactly as in the school's email (it looks like WHA-STU- and 7 digits).", "bad");
    var rule = Auth.pinRuleError(pin);
    if (rule) return UI.say(msg, rule, "bad");

    UI.busy($("l-btn"), true, "Logging in…");
    Auth.login(id, pin, $("l-remember").checked)
      .then(function () { location.replace("dashboard.html"); })
      .catch(function (e) {
        UI.busy($("l-btn"), false);
        UI.say(msg, e.message, "bad");
        $("l-pin").value = "";
      });
  });

  /* ---------- step A -> email the code ---------- */
  function startCooldown() {
    var left = COOLDOWN_SECONDS, again = $("p-resend");
    again.disabled = true;
    clearInterval(cooldownTimer);
    function tick() {
      if (left <= 0) { clearInterval(cooldownTimer); again.disabled = false; again.textContent = "Send the code again"; return; }
      again.textContent = "Send again in " + left + "s";
      left--;
    }
    tick(); cooldownTimer = setInterval(tick, 1000);
  }

  function requestCode(fromStepA) {
    var msg = $("pin-msg");
    UI.clear(msg);
    if (fromStepA) {
      var id = $("p-id").value, pin = $("p-pin").value, pin2 = $("p-pin2").value;
      if (!Auth.isValidStudentId(id)) return UI.say(msg, "Please type your Student ID exactly as in the school's email (WHA-STU- and 7 digits).", "bad");
      var rule = Auth.pinRuleError(pin);
      if (rule) return UI.say(msg, rule, "bad");
      if (pin !== pin2) return UI.say(msg, "The two PINs are not the same. Please type them again.", "bad");
      held.id = Auth.normalizeId(id); held.pin = pin;
    }
    var btn = fromStepA ? $("p-send") : $("p-resend");
    UI.busy(btn, true, "Sending…");
    Api.otp.request(held.id, mode).then(function (data) {
      UI.busy(btn, false);
      $("step-pin").hidden = true; $("step-code").hidden = false;
      UI.say($("code-note"), (data && data.message) || "If the Student ID is right, a code has been emailed to the parent.", "info");
      startCooldown();
      $("p-code").focus();
    }).catch(function (e) { UI.busy(btn, false); UI.say(msg, e.message, "bad"); });
  }
  $("p-send").addEventListener("click", function () { requestCode(true); });
  $("p-resend").addEventListener("click", function () { requestCode(false); });
  $("p-back").addEventListener("click", function () { held.pin = ""; UI.clear($("pin-msg")); showStepA(); $("p-pin").value = ""; $("p-pin2").value = ""; $("p-pin").focus(); });

  /* ---------- step B -> confirm with the code ---------- */
  $("p-save").addEventListener("click", function () {
    var msg = $("pin-msg"), code = $("p-code").value;
    UI.clear(msg);
    if (!/^\d{6}$/.test(code)) return UI.say(msg, "The code from the email is 6 digits.", "bad");
    if (!held.id || !held.pin) { showStepA(); return UI.say(msg, "Please type the Student ID and PIN again.", "bad"); }

    var btn = $("p-save");
    UI.busy(btn, true, "Saving…");
    var call = mode === "resetpin" ? Api.auth.resetPin : Api.auth.setPin;
    call(held.id, code, held.pin).then(function () {
      UI.busy(btn, false);
      clearInterval(cooldownTimer);
      var id = held.id;
      held.pin = ""; $("p-pin").value = ""; $("p-pin2").value = ""; $("p-code").value = "";
      setMode("login");
      $("l-id").value = id;
      UI.say($("login-msg"), "Your PIN is saved. Now log in with your Student ID and PIN.", "ok");
      $("l-pin").focus();
    }).catch(function (e) { UI.busy(btn, false); UI.say(msg, e.message, "bad"); });
  });
})();
