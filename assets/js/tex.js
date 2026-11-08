/* tex.js — shows maths the way a book does, using KaTeX (self-hosted in assets/vendor/katex).
   Text between single dollar signs is a formula:  "A cube has side $4\ \text{cm}$."   Double dollars = a centred formula.
   SAFE BY DESIGN: the question text is only ever inserted as TEXT. Formulas are drawn with katex.render(), which creates DOM nodes
   and sets their styles through the CSSOM. (katex.renderToString + innerHTML would need style="" attributes, which the strict
   Content-Security-Policy blocks.) The strict CSP (no inline styles, no inline scripts) therefore stays fully switched on. */
(function () {
  var PATTERN = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;

  function mathNode(tex, display) {
    if (!window.katex) return document.createTextNode(tex);
    var wrap = document.createElement("span");
    wrap.className = "tex" + (display ? " tex--display" : "");
    try {
      // katex.render builds real DOM nodes and sets styles through the CSSOM (node.style.x = ...), never through a style="" attribute
      window.katex.render(tex, wrap, { throwOnError: false, displayMode: display, output: "htmlAndMathml", trust: false, strict: "ignore" });
    } catch (e) { return document.createTextNode(tex); }
    return wrap;
  }

  /* Puts `text` into `el` (replacing what was there): plain text stays text, $...$ becomes a formula. */
  function set(el, text) {
    el.textContent = "";
    var s = String(text == null ? "" : text), last = 0, m;
    PATTERN.lastIndex = 0;
    while ((m = PATTERN.exec(s)) !== null) {
      if (m.index > last) el.appendChild(document.createTextNode(s.slice(last, m.index)));
      el.appendChild(mathNode(m[1] !== undefined ? m[1] : m[2], m[1] !== undefined));
      last = PATTERN.lastIndex;
    }
    if (last < s.length) el.appendChild(document.createTextNode(s.slice(last)));
    return el;
  }

  window.TeX = { set: set };
})();
