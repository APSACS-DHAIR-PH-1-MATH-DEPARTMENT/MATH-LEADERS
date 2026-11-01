/* login.js — one page, three jobs:  Log in  |  First time (set PIN)  |  Forgot PIN.
   First time and Forgot PIN are the same screen: Student ID -> code by email -> new PIN. */
(function () {
  var $ = UI.$;
  var mode = "login";            // "login" | "setpin" | "resetpin"
  var cooldownTimer = null;
  var COOLDOWN_SECONDS = 60;

  var params = location.search;
  var wantedMode = (params.match(/[?&]mode=(setpin|resetpin)/) || [])[1];

  // Already logged in? Go straight to Home (unless they came here on purpose to reset the PIN).
  if (!wantedMode && Storage.getToken()) { location.replace("dashboard.html"); return; }

  UI.wirePinToggles(document);
  ["l-pin", "p-code", "p-pin", "p-pin2"].forEach(function (id) { UI.digitsOnly($(id)); });

  if (/[?&]expired=1/.test(params)) UI.say($("page-msg"), "Your session ended. Please log in again.", "info");
  if (/[?&]inactive=1/.test(params)) UI.say($("page-msg"), "This account is not active. Please contact your teacher.", "bad");

  /* ---------- tabs ---------- */
  function setMode(next) {
    mode = next;
    ["login", "setpin", "resetpin"].forEach(function (m) { $("tab-" + m).setAttribute("aria-selected", String(m === mode)); });
    $("panel-login").hidden = mode !== "login";
    $("panel-pin").hidden = mode === "login";
    UI.clear($("login-msg")); UI.clear($("pin-msg"));
    if (mode === "setpin") {
      $("pin-title").textContent = "Set your PIN";
      $("pin-intro").textContent = "We email a 6-digit code to the parent email given at registration. Then you choose your own 6-digit PIN.";
    } else if (mode === "resetpin") {
      $("pin-title").textContent = "Forgot your PIN?";
      $("pin-intro").textContent = "No problem. We email a 6-digit code to the parent email, then you choose a new PIN.";
    }
    if (mode !== "login") { $("step-id").hidden = false; $("step-code").hidden = true; }
    var first = mode === "login" ? $("l-id") : $("p-id");
    if (first) first.focus();
  }
  ["login", "setpin", "resetpin"].forEach(function (m) { $("tab-" + m).addEventListener("click", function () { setMode(m); }); });
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

  /* ---------- send code ---------- */
  function startCooldown() {
    var left = COOLDOWN_SECONDS, send = $("p-send"), again = $("p-resend");
    send.disabled = true; again.disabled = true;
    clearInterval(cooldownTimer);
    function tick() {
      if (left <= 0) {
        clearInterval(cooldownTimer);
        send.disabled = false; again.disabled = false;
        send.textContent = "Send me the code"; again.textContent = "Send the code again";
        return;
      }
      send.textContent = "Send again in " + left + "s"; again.textContent = "Send again in " + left + "s";
      left--;
    }
    tick(); cooldownTimer = setInterval(tick, 1000);
  }

  function sendCode() {
    var msg = $("pin-msg"), id = $("p-id").value;
    UI.clear(msg);
    if (!Auth.isValidStudentId(id)) return UI.say(msg, "Please type your Student ID exactly as in the school's email (WHA-STU- and 7 digits).", "bad");
    var btn = $("p-send");
    UI.busy(btn, true, "Sending…");
    Api.otp.request(Auth.normalizeId(id), mode).then(function (data) {
      UI.busy(btn, false);
      $("step-code").hidden = false;
      UI.say(msg, (data && data.message) || "If the Student ID is right, a code has been emailed.", "ok");
      startCooldown();
      $("p-code").focus();
    }).catch(function (e) { UI.busy(btn, false); UI.say(msg, e.message, "bad"); });
  }
  $("p-send").addEventListener("click", sendCode);
  $("p-resend").addEventListener("click", sendCode);

  /* ---------- save the PIN ---------- */
  $("p-save").addEventListener("click", function () {
    var msg = $("pin-msg");
    var id = Auth.normalizeId($("p-id").value), code = $("p-code").value, pin = $("p-pin").value, pin2 = $("p-pin2").value;
    UI.clear(msg);
    if (!Auth.isValidStudentId(id)) return UI.say(msg, "Please check the Student ID.", "bad");
    if (!/^\d{6}$/.test(code)) return UI.say(msg, "The code from the email is 6 digits.", "bad");
    var rule = Auth.pinRuleError(pin);
    if (rule) return UI.say(msg, rule, "bad");
    if (pin !== pin2) return UI.say(msg, "The two PINs are not the same. Please type them again.", "bad");

    var btn = $("p-save");
    UI.busy(btn, true, "Saving…");
    var call = mode === "resetpin" ? Api.auth.resetPin : Api.auth.setPin;
    call(id, code, pin).then(function () {
      UI.busy(btn, false);
      clearInterval(cooldownTimer);
      $("p-pin").value = ""; $("p-pin2").value = ""; $("p-code").value = "";
      setMode("login");
      $("l-id").value = id;
      UI.say($("login-msg"), "Your PIN is saved. Now log in with your Student ID and PIN.", "ok");
      $("l-pin").focus();
    }).catch(function (e) { UI.busy(btn, false); UI.say(msg, e.message, "bad"); });
  });
})();
