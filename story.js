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
})();
