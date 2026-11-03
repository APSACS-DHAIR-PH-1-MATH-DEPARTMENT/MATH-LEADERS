/* datetime.js — every date and time on the site is shown in PAKISTAN time (UTC+5), whatever the phone's own setting is.
   The server stores UTC ("2026-11-03T04:30:00Z"); this file turns it into "Tue 3 Nov 2026, 9:30 AM" and back into the
   "2026-11-03T09:30" text that <input type="datetime-local"> uses. No Intl needed, so it works on old phones too. */
(function () {
  var PKT_MS = 5 * 60 * 60 * 1000;
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function shifted(iso) {
    var ms = Date.parse(iso);
    return isNaN(ms) ? null : new Date(ms + PKT_MS);
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /* "Tue 3 Nov 2026, 9:30 AM" */
  function format(iso) {
    var d = shifted(iso);
    if (!d) return "—";
    var h = d.getUTCHours(), ap = h >= 12 ? "PM" : "AM";
    h = h % 12; if (h === 0) h = 12;
    return DAYS[d.getUTCDay()] + " " + d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear() + ", " + h + ":" + pad(d.getUTCMinutes()) + " " + ap;
  }
  /* "3 Nov 2026" */
  function dateOnly(iso) {
    var d = shifted(iso);
    return d ? d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear() : "—";
  }
  /* "3 minutes ago", "Yesterday", or the date */
  function ago(iso) {
    var ms = Date.parse(iso);
    if (isNaN(ms)) return "";
    var s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 60) return "just now";
    if (s < 3600) return Math.round(s / 60) + " min ago";
    if (s < 86400) return Math.round(s / 3600) + " h ago";
    if (s < 172800) return "yesterday";
    return dateOnly(iso);
  }
  /* "2026-11-03T09:30" in Pakistan time, for <input type="datetime-local"> */
  function toInput(iso) {
    var d = shifted(iso || new Date().toISOString());
    return d ? d.toISOString().slice(0, 16) : "";
  }
  function nowInput() { return toInput(new Date().toISOString()); }

  window.DT = { format: format, dateOnly: dateOnly, ago: ago, toInput: toInput, nowInput: nowInput };
})();
