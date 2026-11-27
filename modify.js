/* Modify a plan: choose a plan, drag over the part you want changed, describe or pick the change, watch it redraw. */
(function () {
  'use strict';
  var PL = window.UBCPL, root = document.getElementById('mod2');
  if (!PL || !root) return;
  var G = window.gsap, RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var $ = function (s, r) { return (r || root).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || root).querySelectorAll(s)); };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var usd = window.UBCusd || function (n) { return '$' + n; };
  var fx = function (fn) { if (G && !RM) fn(); };               // animations are optional polish

  var CHIPS = ['Make it bigger', 'Add a window', 'Add a door', 'Add a closet', 'Add an island', 'Open it up'];

  root.innerHTML =
    '<div class="m2">' +
    '<div class="m2-pick"><div class="m2-step"><b>1</b>Choose a plan</div><div class="m2-strip" id="m2Strip" role="listbox" aria-label="Plans">' +
    PL.map(function (p) {
      return '<button type="button" class="m2-pl" role="option" data-id="' + p.id + '" aria-selected="false">' + window.UBCplanSvg(p, 120) +
        '<b>' + esc(p.n) + '</b><small>' + p.sf.toLocaleString() + ' sq ft' + (p.bd ? ' · ' + p.bd + ' bed' : '') + '</small></button>';
    }).join('') + '</div></div>' +
    '<div class="m2-win">' +
    '<div class="m2-bar"><i class="d r"></i><i class="d y"></i><i class="d g"></i>' +
    '<div class="m2-nav"><button type="button" id="m2Prev" aria-label="Previous plan">&lsaquo;</button><span id="m2Name">No plan chosen yet</span><button type="button" id="m2Next" aria-label="Next plan">&rsaquo;</button></div>' +
    '<span class="m2-hint"><b>2</b>Drag over an area to change it</span></div>' +
    '<div class="m2-sel" id="m2Sel"><div><span id="m2SelTx"></span><button type="button" id="m2Clear">Clear</button></div></div>' +
    '<div class="m2-body">' +
    '<div class="m2-stage" id="m2Stage"><svg id="m2Svg" role="img" aria-label="Plan to mark up"></svg><div class="m2-box" id="m2Box" hidden></div><div class="m2-empty" id="m2Empty">Pick a plan above to start</div></div>' +
    '<aside class="m2-side">' +
    '<div class="m2-quote" id="m2Quote" hidden><b id="m2QT"></b><span id="m2QS"></span></div>' +
    '<div class="m2-lbl" id="m2RL" hidden>Or tap a room</div><div class="m2-rooms" id="m2Rooms"></div>' +
    '<div class="m2-lbl">Quick changes</div><div class="m2-chips" id="m2Chips">' + CHIPS.map(function (c) { return '<button type="button" disabled>' + c + '</button>'; }).join('') + '</div>' +
    '<ol class="m2-list" id="m2List"><li class="empty">Your changes will be listed here.</li></ol>' +
    '<form class="m2-ask" id="m2Ask" autocomplete="off"><input id="m2In" type="text" placeholder="Ask for anything else…" aria-label="Describe a change"><button type="submit" class="skb red">Add</button></form>' +
    '<button type="button" class="btn" id="m2Apply" disabled>Apply my changes</button>' +
    '<p class="mut" id="m2Note">Demo: changes are redrawn locally. Your real request goes to our team.</p>' +
    '</aside></div></div></div>';

  var stage = $('#m2Stage'), svg = $('#m2Svg'), box = $('#m2Box'), selBar = $('#m2Sel'), list = $('#m2List'),
    apply = $('#m2Apply'), note = $('#m2Note'), input = $('#m2In');
  var plan = null, rooms = [], sel = null, changes = [], drag = null, sent = false;

  /* ---------- geometry helpers ---------- */
  function toPlan(cx, cy) { var pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy; var m = svg.getScreenCTM(); return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 }; }
  function toClient(x, y) { var pt = svg.createSVGPoint(); pt.x = x; pt.y = y; return pt.matrixTransform(svg.getScreenCTM()); }
  function bounds() { var W = 0, H = 0; plan.rooms.forEach(function (r) { W = Math.max(W, r[2]); H = Math.max(H, r[3]); }); return { W: W, H: H }; }

  function nameRooms(p) {
    var parts = p.rooms.slice(1).map(function (r, i) { return { i: i, r: r, a: (r[2] - r[0]) * (r[3] - r[1]) }; });
    var live = parts.filter(function (o) { return o.a > 0; }).sort(function (a, b) { return b.a - a.a; });
    var bed = 0, names = {};
    live.forEach(function (o, k) {
      if (k === 0) names[o.i] = p.bd ? 'Living / kitchen' : 'Main space';
      else if (p.ba && o.a <= 120) names[o.i] = 'Bath';
      else if (p.bd) names[o.i] = (p.bd > 1 || bed) ? 'Bedroom ' + (++bed + 0) : 'Bedroom';
      else names[o.i] = 'Room ' + (k + 1);
    });
    return parts.map(function (o) {
      var r = o.r;
      return { i: o.i, x0: r[0], y0: r[1], x1: r[2], y1: r[3], line: o.a <= 0, name: names[o.i] || 'Divider' };
    });
  }

  /* ---------- choose a plan ---------- */
  function setPlan(id, first) {
    var p = PL.filter(function (x) { return x.id === id; })[0];
    if (!p || p === plan) return;
    plan = p; rooms = nameRooms(p); changes = []; sent = false;
    $$('.m2-pl').forEach(function (b) { var on = b.dataset.id === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); if (on && !first) b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: RM ? 'auto' : 'smooth' }); });
    $('#m2Name').textContent = p.n + ' · ' + usd(p.pr);
    $('#m2Empty').hidden = true;
    var b = bounds(), s = '<g id="m2Out"><rect class="out" x="0" y="0" width="' + b.W + '" height="' + b.H + '"/></g>';
    rooms.forEach(function (r) {
      if (r.line) { s += '<line class="wall" x1="' + r.x0 + '" y1="' + r.y0 + '" x2="' + r.x1 + '" y2="' + r.y1 + '"/>'; return; }
      s += '<g class="rm" data-i="' + r.i + '"><rect x="' + r.x0 + '" y="' + r.y0 + '" width="' + (r.x1 - r.x0) + '" height="' + (r.y1 - r.y0) + '"/>' +
        '<text x="' + (r.x0 + .8) + '" y="' + (r.y0 + 1.9) + '">' + esc(r.name.toUpperCase()) + '</text></g>';
    });
    s += '<g id="m2Marks"></g><g id="m2Adds"></g>';
    svg.setAttribute('viewBox', '-3 -3 ' + (b.W + 6) + ' ' + (b.H + 6));
    svg.innerHTML = s;
    clearSel(true); renderList(); renderRooms();
    fx(function () {                                              // walls draw themselves in
      var els = $$('.out, .rm rect, .wall', svg);
      G.from(els, { strokeDasharray: 1, strokeDashoffset: 1, duration: 1.3, ease: 'power2.inOut', stagger: 0.07, onStart: function () { els.forEach(function (e) { e.setAttribute('pathLength', 1); }); }, clearProps: 'strokeDasharray,strokeDashoffset' });
      G.from($$('.rm', svg), { opacity: 0, duration: 0.8, stagger: 0.08, delay: 0.5 });
      G.from(stage, { scale: 0.97, duration: 0.9, ease: 'expo.out' });
      G.from($('#m2Name'), { y: 10, opacity: 0, duration: 0.6, ease: 'power3.out' });
    });
  }
  function step(d) { var i = plan ? PL.indexOf(plan) : (d > 0 ? -1 : 0); setPlan(PL[(i + d + PL.length) % PL.length].id); }
  $('#m2Strip').addEventListener('click', function (e) { var b = e.target.closest('.m2-pl'); if (b) setPlan(b.dataset.id); });
  $('#m2Prev').onclick = function () { step(-1); };
  $('#m2Next').onclick = function () { step(1); };

  function renderRooms() {
    var h = rooms.filter(function (r) { return !r.line; });
    $('#m2RL').hidden = !h.length;
    $('#m2Rooms').innerHTML = h.map(function (r) { return '<button type="button" data-i="' + r.i + '">' + esc(r.name) + '</button>'; }).join('');
    fx(function () { G.from('#m2Rooms button', { y: 12, opacity: 0, duration: 0.5, stagger: 0.04, ease: 'power3.out', delay: 0.6 }); });
  }
  $('#m2Rooms').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var r = rooms.filter(function (x) { return String(x.i) === b.dataset.i; })[0];
    if (r) select(r.x0, r.y0, r.x1, r.y1);
  });

  /* ---------- drag to select ---------- */
  function stageXY(e) { var b = stage.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
  stage.addEventListener('pointerdown', function (e) {
    if (!plan || e.button > 0) return;
    stage.setPointerCapture(e.pointerId);
    var p = stageXY(e); drag = { sx: p.x, sy: p.y, cx: e.clientX, cy: e.clientY, moved: false };
    box.hidden = false; box.classList.remove('done');
    box.style.cssText = 'left:' + p.x + 'px;top:' + p.y + 'px;width:0;height:0';
    stage.classList.add('drag');
  });
  stage.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var p = stageXY(e), x = Math.min(p.x, drag.sx), y = Math.min(p.y, drag.sy), w = Math.abs(p.x - drag.sx), h = Math.abs(p.y - drag.sy);
    if (w + h > 6) drag.moved = true;
    box.style.left = x + 'px'; box.style.top = y + 'px'; box.style.width = w + 'px'; box.style.height = h + 'px';
    var a = toPlan(Math.min(e.clientX, drag.cx), Math.min(e.clientY, drag.cy)), z = toPlan(Math.max(e.clientX, drag.cx), Math.max(e.clientY, drag.cy));
    hilite(a.x, a.y, z.x, z.y);
  });
  function endDrag(e) {
    if (!drag) return; stage.classList.remove('drag');
    var d = drag; drag = null;
    var a = toPlan(Math.min(e.clientX, d.cx), Math.min(e.clientY, d.cy)), z = toPlan(Math.max(e.clientX, d.cx), Math.max(e.clientY, d.cy));
    if (!d.moved) {                                               // a plain click picks the room under the pointer
      var hit = roomAt(a.x, a.y);
      if (hit) select(hit.x0, hit.y0, hit.x1, hit.y1); else clearSel();
      return;
    }
    select(a.x, a.y, z.x, z.y);
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', function () { drag = null; stage.classList.remove('drag'); });

  function roomAt(x, y) { for (var i = rooms.length - 1; i >= 0; i--) { var r = rooms[i]; if (!r.line && x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) return r; } return null; }
  function overlap(r, x0, y0, x1, y1) { var w = Math.min(r.x1, x1) - Math.max(r.x0, x0), h = Math.min(r.y1, y1) - Math.max(r.y0, y0); return w > 0 && h > 0 ? w * h : 0; }
  function hits(x0, y0, x1, y1) {
    return rooms.filter(function (r) { if (r.line) return false; var a = (r.x1 - r.x0) * (r.y1 - r.y0); return overlap(r, x0, y0, x1, y1) / a >= 0.25; });
  }
  function hilite(x0, y0, x1, y1) {
    var on = hits(x0, y0, x1, y1).map(function (r) { return String(r.i); });
    $$('.rm', svg).forEach(function (g) { g.classList.toggle('hit', on.indexOf(g.dataset.i) > -1); });
  }

  function select(x0, y0, x1, y1) {
    var b = bounds();
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(b.W, x1); y1 = Math.min(b.H, y1);
    if (x1 - x0 < 0.6 || y1 - y0 < 0.6) { clearSel(); return; }
    var hs = hits(x0, y0, x1, y1);
    var label = hs.length === 1 ? hs[0].name : hs.length > 1 ? hs.length + ' rooms' : 'Open area';
    var w = Math.round(x1 - x0), h = Math.round(y1 - y0);
    sel = { x0: x0, y0: y0, x1: x1, y1: y1, rooms: hs, label: label, dim: w + ' × ' + h + ' ft', area: w * h };
    hilite(x0, y0, x1, y1); syncBox(); box.hidden = false; box.classList.remove('done'); void box.offsetWidth; box.classList.add('done');
    $('#m2SelTx').textContent = 'Selected · ' + label + ' · ' + sel.dim;
    selBar.classList.add('on');
    $('#m2QT').textContent = label; $('#m2QS').textContent = sel.dim + ' · about ' + sel.area.toLocaleString() + ' sq ft';
    var q = $('#m2Quote'), was = q.hidden; q.hidden = false;
    $$('#m2Chips button').forEach(function (c) { c.disabled = false; });
    $('.m2-hint').classList.add('ok'); $('.m2-hint').innerHTML = '<b>3</b>Pick a change, or describe your own';
    fx(function () {
      G.fromTo(box, { scale: 1.04 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' });
      G.fromTo(q, { x: was ? 40 : 14, opacity: was ? 0 : 0.4 }, { x: 0, opacity: 1, duration: 0.7, ease: 'expo.out' });
      G.from('#m2Chips button', { y: 10, opacity: 0, scale: 0.9, duration: 0.5, stagger: 0.05, ease: 'back.out(2)', clearProps: 'all', overwrite: true });
    });
  }
  function syncBox() {
    if (!sel) return;
    var a = toClient(sel.x0, sel.y0), z = toClient(sel.x1, sel.y1), s = stage.getBoundingClientRect();
    box.style.left = (a.x - s.left) + 'px'; box.style.top = (a.y - s.top) + 'px';
    box.style.width = (z.x - a.x) + 'px'; box.style.height = (z.y - a.y) + 'px';
  }
  function clearSel(silent) {
    sel = null; box.hidden = true; box.classList.remove('done');
    selBar.classList.remove('on'); $('#m2Quote').hidden = true;
    $$('.rm', svg).forEach(function (g) { g.classList.remove('hit'); });
    $$('#m2Chips button').forEach(function (c) { c.disabled = true; });
    $('.m2-hint').classList.remove('ok'); $('.m2-hint').innerHTML = '<b>2</b>' + (plan ? 'Drag over an area to change it' : 'Choose a plan first');
  }
  $('#m2Clear').onclick = function () { clearSel(); };
  if (window.ResizeObserver) new ResizeObserver(syncBox).observe(stage); else window.addEventListener('resize', syncBox);

  /* ---------- changes ---------- */
  function addChange(text) {
    text = String(text || '').trim();
    if (!plan) { nudge('#m2Strip'); return; }
    if (!sel) { nudge('#m2Stage'); note.textContent = 'Drag over the part of the plan you want changed first.'; return; }
    var n = changes.length + 1, c = { n: n, t: text, sel: sel, done: false };
    changes.push(c);
    var m = document.createElementNS(NS, 'g');                    // numbered marker on the plan
    m.setAttribute('class', 'mk'); m.innerHTML = '<circle cx="' + sel.x0 + '" cy="' + sel.y0 + '" r=".9"/><text x="' + sel.x0 + '" y="' + (sel.y0 + .38) + '" text-anchor="middle">' + n + '</text>';
    $('#m2Marks', svg).appendChild(m); c.mk = m;
    fx(function () { G.from(m, { scale: 0, transformOrigin: sel.x0 + 'px ' + sel.y0 + 'px', duration: 0.6, ease: 'back.out(3)' }); });
    renderList(true);
    apply.disabled = false; input.value = '';
    note.textContent = changes.length + ' change' + (changes.length > 1 ? 's' : '') + ' ready. Select another area, or apply them.';
  }
  function renderList(animateLast) {
    if (!changes.length) { list.innerHTML = '<li class="empty">Your changes will be listed here.</li>'; apply.disabled = true; return; }
    list.innerHTML = changes.map(function (c) { return '<li class="' + (c.done ? 'ok' : '') + '"><i>' + c.n + '</i><span><b>' + esc(c.sel.label) + '</b>' + esc(c.t) + '</span></li>'; }).join('');
    changes.forEach(function (c, k) { c.li = list.children[k]; });
    if (animateLast) fx(function () { G.from(list.lastChild, { x: 30, opacity: 0, duration: 0.6, ease: 'expo.out' }); });
  }
  function nudge(sel2) { fx(function () { G.fromTo(sel2, { x: -6 }, { x: 0, duration: 0.6, ease: 'elastic.out(1.2,.3)' }); }); }
  $('#m2Chips').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b && !b.disabled) addChange(b.textContent); });
  $('#m2Ask').addEventListener('submit', function (e) { e.preventDefault(); if (input.value.trim()) addChange(input.value); });

  /* ---------- redraw ---------- */
  function glow(el) { if (!el) return; el.classList.add('glow'); setTimeout(function () { el.classList.remove('glow'); }, 1500); }
  function draw(c) {
    var t = c.t.toLowerCase(), s = c.sel, add = $('#m2Adds', svg), cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2, w = s.x1 - s.x0, h = s.y1 - s.y0, g = null;
    var gs = s.rooms.map(function (r) { return svg.querySelector('.rm[data-i="' + r.i + '"]'); }).filter(Boolean);
    function mk(html) { var n = document.createElementNS(NS, 'g'); n.setAttribute('class', 'mn'); n.innerHTML = html; add.appendChild(n); fx(function () { G.from(n, { opacity: 0, duration: 0.7 }); }); glow(n); return n; }
    if (/bigger|larger|expand|wider|enlarge|more space/.test(t) && gs.length) {
      gs.forEach(function (el) {
        var bb = el.getBBox(), ox = bb.x + bb.width / 2, oy = bb.y + bb.height / 2;
        el.style.transformBox = 'view-box'; el.style.transformOrigin = ox + 'px ' + oy + 'px';
        if (G && !RM) G.to(el, { scale: 1.12, duration: 1.1, ease: 'elastic.out(1,.55)', transformOrigin: ox + 'px ' + oy + 'px' }); else el.style.transform = 'scale(1.12)';
        glow(el);
      });
    } else if (/window/.test(t)) {
      var L = Math.min(4, Math.max(2, w * 0.5));
      g = mk('<rect x="' + (cx - L / 2) + '" y="' + (s.y0 - .45) + '" width="' + L + '" height=".9" fill="#fff" stroke="#13233a" stroke-width=".25"/><line x1="' + (cx - L / 2) + '" y1="' + s.y0 + '" x2="' + (cx + L / 2) + '" y2="' + s.y0 + '" stroke="#2e6a8e" stroke-width=".25"/>');
    } else if (/door|entry|opening/.test(t)) {
      var d = Math.min(3.2, Math.max(2, Math.min(w, h) * 0.45));
      g = mk('<line x1="' + (cx - d / 2) + '" y1="' + s.y1 + '" x2="' + (cx + d / 2) + '" y2="' + s.y1 + '" stroke="#fff" stroke-width=".9"/><line x1="' + (cx - d / 2) + '" y1="' + s.y1 + '" x2="' + (cx - d / 2) + '" y2="' + (s.y1 - d) + '" stroke="#13233a" stroke-width=".25"/><path d="M' + (cx - d / 2) + ' ' + (s.y1 - d) + ' A' + d + ' ' + d + ' 0 0 1 ' + (cx + d / 2) + ' ' + s.y1 + '" fill="none" stroke="#13233a" stroke-width=".18"/>');
    } else if (/island|kitchen/.test(t)) {
      var iw = Math.min(6, Math.max(3, w * 0.5));
      g = mk('<rect x="' + (cx - iw / 2) + '" y="' + (cy - 1.1) + '" width="' + iw + '" height="2.2" rx=".3" fill="#fff" stroke="#13233a" stroke-width=".25"/>');
    } else if (/walk|closet|storage|pantry/.test(t)) {
      var cw = Math.min(4, w * 0.5), ch = Math.min(3, h * 0.5);
      g = mk('<rect x="' + (s.x1 - cw) + '" y="' + (s.y1 - ch) + '" width="' + cw + '" height="' + ch + '" fill="rgba(46,106,142,.1)" stroke="#13233a" stroke-width=".25"/><line x1="' + (s.x1 - cw) + '" y1="' + (s.y1 - ch) + '" x2="' + s.x1 + '" y2="' + s.y1 + '" stroke="#9aa6b0" stroke-width=".15"/>');
    } else if (/open|remove|wall|merge/.test(t) && gs.length) {
      gs.forEach(function (el) { el.classList.add('open'); glow(el); });
    } else {
      g = mk('<rect x="' + (s.x0 - .4) + '" y="' + (s.y0 - .4) + '" width="' + (w + .8) + '" height="' + (h + .8) + '" rx="1" fill="none" stroke="#6d4cff" stroke-width=".3" stroke-dasharray="1.2 .9"/>');
    }
    c.done = true; c.mk.classList.add('ok'); if (c.li) c.li.classList.add('ok');
  }
  apply.onclick = function () {
    if (sent) {                                                   // second click: hand the changes to the contact form
      var m = document.getElementById('m');
      if (m) m.value = (m.value ? m.value + '\n' : '') + 'Plan changes to ' + plan.n + ': ' + changes.map(function (c) { return c.n + ') ' + c.sel.label + ': ' + c.t; }).join('; ');
      var ct = document.getElementById('contact'); if (ct) ct.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    apply.disabled = true;
    changes.filter(function (c) { return !c.done; }).forEach(function (c, k) { setTimeout(function () { draw(c); }, k * 700); });
    setTimeout(function () { sent = true; apply.disabled = false; apply.textContent = 'Send revisions to UBC'; note.textContent = 'Redrawn. Happy with it? Send it to our team and we will price the revised plan.'; clearSel(); }, changes.length * 700 + 300);
  };

  /* "Change it first" on a shop plan jumps here with that plan chosen */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.pdetail a[href="#modify"]'); if (!a) return;
    var h = a.closest('.pdetail').querySelector('h3'), p = h && PL.filter(function (x) { return x.n === h.textContent; })[0];
    if (p) setPlan(p.id, true);
  }, true);

  clearSel();
  window.UBCModify = { setPlan: setPlan };
})();
