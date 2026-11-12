/* pager.js — long lists, 10 at a time, with a small per-tab cache so a repeat visit is instant.
   Used by Practice and Exercises. Nothing here talks to the server by itself: the page hands in a fetch function.

   How it feels:
     - the first 10 questions appear as soon as they arrive; the next 10 are fetched quietly in the background (one page ahead, never more);
     - when the child scrolls near the bottom the next 10 are added by themselves; a visible "Load 10 more" button is always there as a fallback
       (also the only way when the browser has no IntersectionObserver);
     - a failed load keeps every card already shown and turns the button into "Try again".
   The cache (sessionStorage, this tab only, wiped at logout) is keyed by student + class + the server's content version (`v`), so a page is only
   ever reused while the teacher has not changed anything. It is never trusted until the chapter list of THIS visit came back from the server.
   All server text is still inserted as text by the page's own render function. */
(function () {
  var PREFIX = "aps:pg:";
  var PAGE = 10;

  /* =============================== session cache =============================== */
  function ss() { try { return window.sessionStorage; } catch (e) { return null; } }
  function sid() { var p = window.Storage && window.Storage.getProfile(); return p && p.studentId ? String(p.studentId) : ""; }
  function enc(x) { return encodeURIComponent(String(x)); }

  function wipe() { if (window.Storage && window.Storage.clearPages) window.Storage.clearPages(); }

  function put(key, value) {
    var s = ss(); if (!s) return;
    var text = JSON.stringify(value);
    try { s.setItem(key, text); }
    catch (e) {
      wipe();                       // storage is full: drop our old pages and try once more, then give up quietly
      try { s.setItem(key, text); } catch (e2) { /* ignore */ }
    }
  }
  function read(key) {
    var s = ss(); if (!s) return null;
    try { return JSON.parse(s.getItem(key) || "null"); } catch (e) { return null; }
  }
  function keysWith(prefix) {
    var s = ss(), out = [];
    if (!s) return out;
    try { for (var i = 0; i < s.length; i++) { var k = s.key(i); if (k && k.indexOf(prefix) === 0) out.push(k); } } catch (e) { /* ignore */ }
    return out;
  }

  /* The chapter list of a visit: shown at once from the cache, then replaced quietly by the server's answer.
     render(data, isRefresh) draws it. fail(error) is called only when there was nothing cached to show.
     The returned object holds the content version (v) and class (cls) of the SERVER's answer; both stay undefined until it has arrived,
     which is exactly when cached pages may start to be trusted. */
  function options(kind, fetch, render, fail) {
    var state = { v: undefined, cls: undefined };
    var key = PREFIX + sid() + ":o:" + kind;
    var cached = sid() ? read(key) : null;
    if (cached && !cached.data) cached = null;
    var shown = false;
    if (cached) { render(cached.data, false); shown = true; }
    fetch().then(function (data) {
      var same = !!cached && cached.cls === data.classLevel &&
        (data.v !== undefined ? cached.v === data.v : JSON.stringify(cached.data) === JSON.stringify(data));
      state.v = data.v; state.cls = data.classLevel;
      if (sid()) put(key, { v: data.v, cls: data.classLevel, data: data });
      if (!shown || !same) { render(data, shown); shown = true; }
    }, function (e) { if (!shown && fail) fail(e); });
    return state;
  }

  /* The pages of one chapter/collection. `ns` names it. Pages are only READ once the server has confirmed the content version of this visit
     (opt.v is set); they are written whenever the server sends one with a version. */
  function pageCache(opt, ns, size) {
    function base() { return PREFIX + sid() + ":p:" + enc(opt.cls) + ":" + enc(ns) + ":"; }
    return {
      get: function (offset) {
        if (!sid() || opt.v === undefined) return null;
        var page = read(base() + enc(opt.v) + ":" + size + ":" + offset);
        return page && Array.isArray(page.items) ? page : null;
      },
      set: function (offset, page) {
        if (!sid() || page.v === undefined || opt.cls === undefined) return;
        var b = base(), keep = b + enc(page.v) + ":";
        keysWith(b).forEach(function (k) { if (k.indexOf(keep) !== 0) { try { ss().removeItem(k); } catch (e) { /* ignore */ } } });   // older versions of this chapter
        put(keep + size + ":" + offset, page);
      }
    };
  }

  /* =============================== the pager =============================== */
  /* o: listEl, moreEl, countEl, emptyEl (elements) · pageSize · cache (pageCache or null) · idOf(item) · render(item, number) -> Node
        fetch(offset, limit) -> Promise of { items, total, hasMore, next, v } · onError(error) · onOk() */
  function create(o) {
    var size = o.pageSize || PAGE;
    var S = { shown: 0, next: 0, total: null, hasMore: true, loading: false, error: false, dead: false, buffer: null, local: null, seen: {}, first: true };
    var sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    o.moreEl.parentNode.insertBefore(sentinel, o.moreEl.nextSibling);
    var obs = null;
    if (typeof window.IntersectionObserver === "function") {
      obs = new window.IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) if (entries[i].isIntersecting) { loadMore(); return; }
      }, { rootMargin: "0px 0px 600px 0px" });
    }

    function paint() {
      var total = S.total === null ? 0 : Math.max(S.total, S.shown);
      if (o.countEl) {
        o.countEl.textContent = (S.shown === 0 && S.loading) ? "Loading…" : (total === 0 ? "" : total + " question" + (total === 1 ? "" : "s") + " · showing " + S.shown);
      }
      if (o.emptyEl) o.emptyEl.hidden = !(S.total === 0 && S.shown === 0 && !S.loading && !S.error);
      o.moreEl.hidden = !(S.hasMore && (S.shown > 0 || S.error));
      o.moreEl.disabled = S.loading;
      o.moreEl.textContent = S.error ? "Try again" : "Load " + size + " more";
    }

    function arm() {
      if (!obs || S.dead) return;
      obs.unobserve(sentinel);                       // observing again gives a fresh first callback, so a still-visible sentinel loads the next page
      if (S.hasMore && !S.error && !S.loading && S.shown > 0) obs.observe(sentinel);
    }

    function fetchPage(offset) {
      if (S.local) {                                  // an old server sent everything at once: page it here
        var part = S.local.slice(offset, offset + size), end = offset + part.length, more = end < S.local.length;
        return Promise.resolve({ items: part, total: S.local.length, hasMore: more, next: more ? end : null });
      }
      var hit = o.cache ? o.cache.get(offset) : null;
      if (hit) return Promise.resolve(hit);
      return o.fetch(offset, size).then(function (page) {
        if (page.hasMore === undefined) {             // old server: no paging fields
          S.local = page.items || [];
          return fetchPage(0);
        }
        if (o.cache) o.cache.set(offset, page);
        return page;
      });
    }

    function prefetch() {
      if (S.dead || !S.hasMore || S.buffer) return;
      var offset = S.next, pr = fetchPage(offset);
      S.buffer = { offset: offset, promise: pr };
      pr.then(null, function () { if (S.buffer && S.buffer.promise === pr) S.buffer = null; });   // a failed prefetch is forgotten; the child's own load tries again
    }

    function apply(page) {
      var frag = document.createDocumentFragment(), items = page.items || [];
      for (var i = 0; i < items.length; i++) {
        var id = o.idOf(items[i]);
        if (S.seen[id]) continue;                     // the teacher changed the list while the child was reading: never show a card twice
        S.seen[id] = true;
        frag.appendChild(o.render(items[i], ++S.shown));
      }
      o.listEl.appendChild(frag);
      S.total = page.total === undefined ? S.shown : page.total;
      S.hasMore = !!page.hasMore && page.next !== null && page.next !== undefined;
      S.next = S.hasMore ? page.next : S.next;
      S.loading = false; S.error = false;
      if (o.onOk) o.onOk();
      if (S.first) { S.first = false; window.scrollTo(0, 0); }
      paint(); arm(); prefetch();
    }

    function loadMore() {
      if (S.dead || S.loading || !S.hasMore) return;
      S.loading = true; S.error = false; paint();
      var p = S.buffer && S.buffer.offset === S.next ? S.buffer.promise : fetchPage(S.next);
      S.buffer = null;
      p.then(function (page) { if (!S.dead) apply(page); }, function (e) {
        if (S.dead) return;
        S.loading = false; S.error = true; paint(); arm();
        if (o.onError) o.onError(e);
      });
    }

    o.moreEl.addEventListener("click", loadMore);
    return {
      start: function () { o.listEl.textContent = ""; if (o.emptyEl) o.emptyEl.hidden = true; loadMore(); },
      destroy: function () {
        S.dead = true;
        if (obs) obs.disconnect();
        o.moreEl.removeEventListener("click", loadMore);
        if (sentinel.parentNode) sentinel.parentNode.removeChild(sentinel);
        o.moreEl.hidden = true;
      }
    };
  }

  window.Pager = { create: create, options: options, pageCache: pageCache, PAGE: PAGE };
})();
