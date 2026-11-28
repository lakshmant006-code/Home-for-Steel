/* Navigation behaviour: sliding pill that follows the pointer and rests on the current section, scroll-spy,
   a bar that firms up once you scroll, and the My account panel. */
(function () {
  'use strict';
  var nav = document.getElementById('siteNav'), nl = document.getElementById('nl');
  if (!nav || !nl) return;
  var ind = nl.querySelector('.nind'), items = [].slice.call(nl.querySelectorAll(':scope > a, :scope > .nacct'));
  var active = null, hovered = null;

  /* ---------- pill ---------- */
  function place(el, rest) {
    if (!el || !ind) { if (ind) ind.classList.remove('on'); return; }
    ind.style.width = el.offsetWidth + 'px';
    ind.style.transform = 'translateX(' + el.offsetLeft + 'px)';
    ind.classList.add('on'); ind.classList.toggle('rest', !!rest);
  }
  function settle() { hovered = null; place(active, true); }
  items.forEach(function (el) {
    el.addEventListener('mouseenter', function () { hovered = el; place(el, false); });
    el.addEventListener('focus', function () { hovered = el; place(el, false); });
    el.addEventListener('blur', settle);
  });
  nl.addEventListener('mouseleave', settle);
  addEventListener('resize', function () { place(hovered || active, !hovered); });

  /* ---------- which link is current ---------- */
  function setActive(k) {
    var next = items.filter(function (el) { return el.dataset.k === k; })[0] || null;
    if (next === active) return;
    if (active) active.classList.remove('is-on');
    active = next; if (active) active.classList.add('is-on');
    if (!hovered) place(active, true);
  }
  var SPY = [['top', 'home'], ['about', 'about'], ['contact', 'contact']];
  function spy() {
    var shop = document.getElementById('shopPage'), mod = document.getElementById('modifyPage'), bring = document.getElementById('bringPage'), home = document.getElementById('home');
    if (shop && !shop.hidden) return setActive('shop');
    if (mod && !mod.hidden) return setActive('modify');
    if (bring && !bring.hidden) return setActive('bring');
    if (home && home.hidden) return setActive(null);
    var y = 140, k = 'home';
    SPY.forEach(function (s) { var e = document.getElementById(s[0]); if (e && e.getBoundingClientRect().top <= y) k = s[1]; });
    setActive(k);
  }
  var tick = false;
  function onScroll() {
    nav.classList.toggle('scrolled', scrollY > 8);
    if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; spy(); }); }
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('hashchange', function () { setTimeout(spy, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { place(hovered || active, !hovered); });
  onScroll(); spy();

  /* ---------- My account ---------- */
  var dlg = document.getElementById('acct'), close = document.getElementById('acctX'), opener = null;
  if (!dlg) return;
  function openAcct(from) {
    opener = from || null;
    var menu = document.getElementById('nmenu');
    if (nav.classList.contains('open') && menu) menu.click();
    dlg.hidden = false; document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { close.focus(); });
  }
  function closeAcct() {
    dlg.hidden = true; document.body.style.overflow = '';
    if (opener) opener.focus();
  }
  document.getElementById('acctBtn').addEventListener('click', function (e) { openAcct(e.currentTarget); });
  var pb = document.querySelector('[data-open-account]'); if (pb) pb.addEventListener('click', function (e) { openAcct(null); e.stopPropagation(); });
  close.addEventListener('click', closeAcct);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeAcct(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !dlg.hidden) closeAcct();
    if (e.key === 'Tab' && !dlg.hidden) {                                   // keep focus inside the panel
      var f = [].slice.call(dlg.querySelectorAll('a,button')).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
})();
