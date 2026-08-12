/**
 * Google tag (gtag.js) — EmplyFlow
 * Measurement ID: G-4ZMJ8R420Y
 * Guard: load once per page.
 */
(function () {
  if (window.__efGtagLoaded) return;
  window.__efGtagLoaded = true;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag("js", new Date());
  gtag("config", "G-4ZMJ8R420Y");

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=G-4ZMJ8R420Y";
  var first = document.getElementsByTagName("script")[0];
  first.parentNode.insertBefore(s, first);
})();
