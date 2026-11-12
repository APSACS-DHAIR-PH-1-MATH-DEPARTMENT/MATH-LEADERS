/* api.js — THE ONLY file that talks to the backend. Pages never call fetch() themselves.
   Wire contract:
     POST API_BASE_URL   Content-Type: text/plain;charset=utf-8  (avoids a CORS preflight, which Apps Script cannot answer)
     body (JSON text):   { operation: "area/action", apiKey, token?, ...params }
     reply (HTTP 200):   { success: true, data } | { success: false, error: { code, message } }
   Error codes AUTH_003 / AUTH_004 = the session is over -> back to the login page. */
(function () {
  var CFG = window.APS_CONFIG;

  // Only harmless READS may be retried automatically (a cold start returns an HTML page, not JSON).
  // Login, codes, PIN and registration are NEVER retried — that could burn rate limits or double-apply.
  var RETRYABLE = { "health": 1, "profile/me": 1, "issues/mine": 1, "feedback/mine": 1, "feedback/approved": 1, "feedback/public": 1, "assessments/mine": 1, "assessments/result": 1, "requests/mine": 1, "practice/options": 1, "practice/list": 1, "exercises/options": 1, "exercises/list": 1, "remarks/mine": 1 };

  function notConfigured() {
    return !CFG || !CFG.API_BASE_URL || !CFG.API_KEY ||
      CFG.API_BASE_URL.indexOf("PASTE_") === 0 || CFG.API_KEY.indexOf("PASTE_") === 0;
  }

  function call(operation, params, attempt) {
    attempt = attempt || 1;
    if (notConfigured()) {
      return Promise.reject(new Error("This site is not set up yet (config.js still has the PASTE_ placeholders)."));
    }
    var body = { operation: operation, apiKey: CFG.API_KEY };
    Object.keys(params || {}).forEach(function (k) { body[k] = params[k]; });

    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, CFG.REQUEST_TIMEOUT_MS) : null;
    function done() { if (timer) clearTimeout(timer); }

    return fetch(CFG.API_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (res) { return res.text(); })
      .then(function (text) {
        done();
        var payload = null;
        try { payload = JSON.parse(text); } catch (e) { payload = null; }

        if (payload === null) {   // an HTML page = the server is waking up
          if (RETRYABLE[operation] && attempt < 3) {
            return new Promise(function (resolve) {
              setTimeout(function () { resolve(call(operation, params, attempt + 1)); }, 700 * attempt);
            });
          }
          throw new Error("The server is waking up. Please try again in a few seconds.");
        }
        if (payload.success) return payload.data || {};
        var err = new Error((payload.error && payload.error.message) || "Something went wrong.");
        err.code = payload.error && payload.error.code;
        throw err;
      }, function (e) {
        done();
        if (e && e.name === "AbortError") throw new Error("The server is taking too long. Please try again.");
        throw new Error("Cannot reach the server. Check your internet and try again.");
      });
  }

  function isSessionOver(err) { return err && (err.code === "AUTH_003" || err.code === "AUTH_004"); }
  function isInactive(err) { return err && err.code === "AUTH_002"; }

  // Adds the session token. The backend decides WHO you are from the token alone.
  function authed(operation, params) {
    var p = params || {};
    p.token = window.Storage.getToken();
    return call(operation, p).catch(function (err) {
      if (isSessionOver(err) || isInactive(err)) {
        window.Storage.clearSession();
        window.location.replace("login.html?" + (isInactive(err) ? "inactive=1" : "expired=1"));
      }
      throw err;
    });
  }

  window.Api = {
    call: call, authed: authed,
    health: function () { return call("health"); },
    student: { register: function (form) { return call("student/register", form); } },
    otp: {
      // purpose: "setpin" (first time) or "resetpin" (forgot)
      request: function (studentId, purpose) { return call("otp/request", { studentId: studentId, purpose: purpose }); }
    },
    auth: {
      setPin:   function (studentId, code, pin) { return call("auth/setPin", { studentId: studentId, code: code, pin: pin }); },
      resetPin: function (studentId, code, pin) { return call("auth/resetPin", { studentId: studentId, code: code, pin: pin }); },
      login:    function (studentId, pin, rememberMe) { return call("auth/login", { studentId: studentId, pin: pin, rememberMe: !!rememberMe }); },
      logout:   function () { return authed("auth/logout"); }
    },
    profile: { me: function () { return authed("profile/me"); } },
    issues: { mine: function () { return authed("issues/mine"); } },
    // Update 8 step 5: "samajh nahi aya" (help) and recheck requests, and the teacher's replies
    requests: {
      mine: function () { return authed("requests/mine"); },
      create: function (fields) { return authed("requests/create", fields); },
      seen: function () { return authed("requests/seen"); },
      withdraw: function (requestId) { return authed("requests/withdraw", { requestId: requestId }); }
    },
    // Update 8 steps 6-7: practice questions, exercises/worksheets (with written solutions + videos), teacher's notes. Reads only.
    practice: {
      options: function () { return authed("practice/options"); },
      // paging = { offset, limit } (10 at a time). Without it the server sends everything, as before.
      list: function (chapterRef, topic, paging) {
        var p = { chapterRef: chapterRef, topic: topic || "" };
        if (paging) { p.offset = paging.offset; p.limit = paging.limit; }
        return authed("practice/list", p);
      }
    },
    exercises: {
      options: function () { return authed("exercises/options"); },
      list: function (chapterRef, collectionType, collectionName, paging) {
        var p = { chapterRef: chapterRef, collectionType: collectionType, collectionName: collectionName };
        if (paging) { p.offset = paging.offset; p.limit = paging.limit; }
        return authed("exercises/list", p);
      }
    },
    remarks: { mine: function () { return authed("remarks/mine"); } },
    // Stage 7: diagnostic tests. start/submit are never retried automatically (submit is safe to repeat BY HAND: the server ignores a second one).
    assessments: {
      mine: function () { return authed("assessments/mine"); },
      start: function (assessmentId) { return authed("assessments/start", { assessmentId: assessmentId }); },
      submit: function (attemptId, answers) { return authed("assessments/submit", { attemptId: attemptId, answers: answers }); },
      result: function (attemptId) { return authed("assessments/result", { attemptId: attemptId }); }
    },
    feedback: {
      submit: function (message) { return authed("feedback/submit", { message: message }); },
      mine: function () { return authed("feedback/mine"); },
      approved: function () { return authed("feedback/approved"); },
      publicList: function () { return call("feedback/public"); }   // no login needed: first name + class only
    }
  };
})();
