/* Phone hamburger menu: tap to open or close the link panel. Closes on a link tap, outside tap, Escape, or when the screen grows. */
(function () {
  'use strict';
  var nav = document.querySelector('nav'), btn = document.getElementById('nmenu'), panel = document.getElementById('npanel');
  if (!nav || !btn || !panel) return;
  var BARS = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 8h16M4 16h16"/></svg>';
  var CROSS = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  function setOpen(open) {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
    btn.innerHTML = open ? CROSS : BARS;
  }
  btn.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!nav.classList.contains('open')); });
  panel.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('click', function (e) { if (!nav.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  addEventListener('hashchange', function () { setOpen(false); });
  addEventListener('resize', function () { if (innerWidth > 900) setOpen(false); });
})();
