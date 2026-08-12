/**
 * Microsoft Clarity — EmplyFlow
 * Project ID: y09sx09973
 * Guard: load once per page (no duplicate tags).
 */
(function () {
  if (window.__efClarityLoaded) return;
  window.__efClarityLoaded = true;

  (function (c, l, a, r, i, t, y) {
    c[a] =
      c[a] ||
      function () {
        (c[a].q = c[a].q || []).push(arguments);
      };
    t = l.createElement(r);
    t.async = 1;
    t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", "y09sx09973");
})();
