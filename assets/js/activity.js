/* activity.js — counts what the child does on Practice and Exercises and sends the COUNTS to the server in small batches.
   Sent: which page (practice / exercise), the chapter code, how many questions were tried, how many were right at the first try, and how
   many answers / solutions were opened. Never sent: what the child typed, the questions, the answers. The weekly report uses these numbers.
   A batch goes out 30 seconds after the first thing, at once when 20 things happened, and when the child leaves the page or goes back
   to the chapter list. If the server cannot be reached the numbers are kept and sent again (after a minute); a batch the server refuses
   is dropped, and so is one that failed 5 times in a row. Nothing here ever shows an error to the child. */
(function () {
  var FLUSH_MS = 30000, RETRY_MS = 60000, MAX_EVENTS = 20, MAX_ITEMS = 20, MAX_COUNT = 100, MAX_FAILS = 5;
  var FIELDS = ["attempted", "rightFirstTime", "solutionsViewed"];
  var buf = {}, order = [], events = 0, timer = null, sending = false, fails = 0;

  function keyOf(source, ref) { return source + "|" + ref; }
  function add(source, ref, field, n) {
    var k = keyOf(source, ref), it = buf[k];
    if (!it) { it = buf[k] = { source: source, chapterRef: ref, attempted: 0, rightFirstTime: 0, solutionsViewed: 0 }; order.push(k); }
    it[field] = Math.min(MAX_COUNT, it[field] + n);
  }
  function schedule(ms) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { timer = null; flush(false); }, ms);
  }

  /* One thing the child did. field = attempted | rightFirstTime | solutionsViewed. */
  function note(source, ref, field) {
    if (FIELDS.indexOf(field) === -1 || !ref) return;
    add(source, ref, field, 1);
    events++;
    if (events >= MAX_EVENTS) { flush(false); return; }
    if (!timer) schedule(FLUSH_MS);
  }

  function take() {
    var keys = order.splice(0, MAX_ITEMS), items = [];
    keys.forEach(function (k) {
      var it = buf[k]; delete buf[k];
      it.rightFirstTime = Math.min(it.rightFirstTime, it.attempted);   // can never be more than the tries
      items.push(it);
    });
    events = 0;
    return items;
  }
  function putBack(items) {
    items.forEach(function (it) {
      FIELDS.forEach(function (f) { if (it[f]) add(it.source, it.chapterRef, f, it[f]); });
    });
  }

  /* Sends what is waiting. keepalive = true when the page is being left (the browser then finishes the request by itself). */
  function flush(keepalive) {
    if (timer) { clearTimeout(timer); timer = null; }
    if (sending || !order.length) return;
    var items = take();
    sending = true;
    Api.practice.activity(items, !!keepalive).then(function () {
      sending = false; fails = 0;
      if (order.length) schedule(order.length >= MAX_ITEMS ? 0 : FLUSH_MS);
    }, function (err) {
      sending = false;
      if (err && /^VAL/.test(String(err.code || ""))) { fails = 0; if (order.length) schedule(FLUSH_MS); return; }   // refused: give these up
      fails++;
      if (fails >= MAX_FAILS) { fails = 0; if (order.length) schedule(FLUSH_MS); return; }                            // keeps failing: give up
      putBack(items);
      schedule(RETRY_MS);
    });
  }

  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") flush(true); });
  window.addEventListener("pagehide", function () { flush(true); });

  window.Activity = { note: note, flush: flush };
})();
