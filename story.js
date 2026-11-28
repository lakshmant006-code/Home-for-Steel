/* Story caption: mirrors the active step into a sticky caption (left on desktop, bottom on phones) that changes as the cards scroll. */
(function () {
  'use strict';
  var l = document.querySelector('.sg-l'), sts = [].slice.call(document.querySelectorAll('.st'));
  if (!l || !sts.length) return;
  var cap = document.createElement('div');
  cap.className = 'sg-cap';
  cap.setAttribute('aria-live', 'polite');
  var items = sts.map(function (s, i) {
    var d = document.createElement('div');
    d.className = 'capi' + (s.classList.contains('on') ? ' on' : '');
    d.innerHTML = s.innerHTML + '<span class="capn">' + (i + 1) + ' / ' + sts.length + '</span>';
    cap.appendChild(d);
    return d;
  });
  l.appendChild(cap);
  function sync() { sts.forEach(function (s, i) { items[i].classList.toggle('on', s.classList.contains('on')); }); }
  var mo = new MutationObserver(sync);
  sts.forEach(function (s) { s.setAttribute('aria-hidden', 'true'); mo.observe(s, { attributes: true, attributeFilter: ['class'] }); });
  sync();

  /* ---- the cards are videos: load each when the section is near, play only the one that is showing, always muted ---- */
  var vids = [].slice.call(document.querySelectorAll('.sg-r video.fg')), RMv = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (vids.length) {
    var loaded = false;
    function loadAll() { if (loaded) return; loaded = true; vids.forEach(function (v) { v.muted = true; v.src = v.dataset.src; v.preload = 'metadata'; v.load(); }); syncVids(); }
    function syncVids() {
      vids.forEach(function (v) {
        var on = v.classList.contains('on');
        if (on && !RMv) { try { v.currentTime = 0; } catch (e) {} var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
        else v.pause();
      });
    }
    var vmo = new MutationObserver(function (muts) { muts.forEach(function (m) { var v = m.target, on = v.classList.contains('on'); if (!loaded) return;
      if (on && !RMv) { try { v.currentTime = 0; } catch (e) {} var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } else v.pause(); }); });
    vids.forEach(function (v) { vmo.observe(v, { attributes: true, attributeFilter: ['class'] }); });
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) loadAll(); }, { rootMargin: '600px 0px' }).observe(document.getElementById('story'));
    document.addEventListener('visibilitychange', function () { if (document.hidden) vids.forEach(function (v) { v.pause(); }); else if (loaded) syncVids(); });
  }
})();
