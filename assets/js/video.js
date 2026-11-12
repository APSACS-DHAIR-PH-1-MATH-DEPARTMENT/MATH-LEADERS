/* video.js — "Video dekho": a YouTube video opens INSIDE the page only when the student taps the button.
   Nothing from YouTube is loaded before that tap (no autoplay, no tracking until then). Uses youtube-nocookie.com.
   The id must be exactly 11 letters/digits/_/-, anything else shows nothing. The page's CSP allows only frame-src https://www.youtube-nocookie.com. */
(function () {
  var ID_RE = /^[A-Za-z0-9_-]{11}$/;
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }

  function button(videoId) {
    var box = h("div", "video");
    if (!ID_RE.test(String(videoId || ""))) return box;
    var btn = h("button", "btn btn--small btn--ghost", "Video dekho"); btn.type = "button"; btn.setAttribute("aria-expanded", "false");
    var holder = h("div", "video__frame"); holder.hidden = true;
    btn.addEventListener("click", function () {
      if (holder.hidden) {
        if (!holder.firstChild) {
          var f = document.createElement("iframe");
          f.src = "https://www.youtube-nocookie.com/embed/" + videoId + "?rel=0";
          f.title = "Explanation video";
          f.setAttribute("allowfullscreen", "");
          f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
          f.setAttribute("loading", "lazy");
          f.setAttribute("allow", "accelerometer; encrypted-media; gyroscope; picture-in-picture");
          holder.appendChild(f);
        }
        holder.hidden = false; btn.textContent = "Video band karo"; btn.setAttribute("aria-expanded", "true");
      } else {
        holder.textContent = ""; holder.hidden = true; btn.textContent = "Video dekho"; btn.setAttribute("aria-expanded", "false");   // removing the frame stops the video
      }
    });
    box.appendChild(btn); box.appendChild(holder);
    return box;
  }

  window.Video = { button: button, isId: function (v) { return ID_RE.test(String(v || "")); } };
})();
