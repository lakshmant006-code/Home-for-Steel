/* Home page room builder.
   Pick predetermined rooms (kitchen, dining, hall...), attach them to each other, and type each room's size in feet: the rectangle rescales to match.
   Rooms snap flush to each other's edges, cannot overlap, and the whole layout can be sent to us from the Contact page. */
(function () {
  'use strict';
  var root = document.getElementById('roomBuilder');
  if (!root) return;
  var G = window.gsap, RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var CW = 70, CH = 42;                                      // the canvas is 70 ft by 42 ft
  var SNAP = 1.5, MIN = 3, MAX = 40, EPS = 1e-6;
  var TYPES = [
    { k: 'kitchen', n: 'Kitchen', w: 12, d: 11, c: '#e3edf8' },
    { k: 'dining', n: 'Dining', w: 11, d: 11, c: '#e9f3e4' },
    { k: 'hall', n: 'Hall', w: 4, d: 12, c: '#f1ede2' },
    { k: 'living', n: 'Living area', w: 16, d: 14, c: '#f6e9e1' },
    { k: 'bed1', n: 'Bedroom 1', w: 13, d: 14, c: '#ebe7f6' },
    { k: 'bed2', n: 'Bedroom 2', w: 11, d: 11, c: '#e5e2f3' },
    { k: 'closet', n: 'Closet', w: 5, d: 6, c: '#eceef0' },
    { k: 'wash', n: 'Washroom', w: 8, d: 6, c: '#def0f0' }
  ];
  var rooms = [], els = {}, sel = null, nextId = 1, drag = null, pd = null, suppressClick = false, msgT = 0;

  function fmt(n) { return String(Math.round(n * 10) / 10); }
  function get(id) { for (var i = 0; i < rooms.length; i++) if (rooms[i].id === id) return rooms[i]; return null; }
  function typeOf(k) { return TYPES.filter(function (t) { return t.k === k; })[0]; }

  /* ---------- markup ---------- */
  root.innerHTML =
    '<div class="bm-pal" id="bmPal" role="group" aria-label="Rooms you can add">' + TYPES.map(function (t) {
      var sw = Math.max(10, Math.min(44, t.w * 2.8)), sh = Math.max(10, Math.min(30, t.d * 2.8));
      return '<button type="button" class="bm-t" data-k="' + t.k + '" aria-label="Add ' + t.n + '"><span class="bm-sw"><i style="width:' + sw + 'px;height:' + sh + 'px;background:' + t.c + '"></i></span><b>' + t.n + '</b><small>' + t.w + ' × ' + t.d + ' ft</small></button>';
    }).join('') + '</div>' +
    '<div class="bm-stage" id="bmStage"><svg id="bmSvg" viewBox="0 0 ' + CW + ' ' + CH + '" role="group" aria-label="Your plan. Drag rooms to attach them to each other.">' +
    '<defs><pattern id="bmG" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0H0V1" fill="none" stroke="rgba(46,106,142,.13)" stroke-width=".04"/></pattern>' +
    '<pattern id="bmG5" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0H0V5" fill="none" stroke="rgba(46,106,142,.26)" stroke-width=".06"/></pattern></defs>' +
    '<rect width="' + CW + '" height="' + CH + '" fill="#fff"/><rect width="' + CW + '" height="' + CH + '" fill="url(#bmG)"/><rect width="' + CW + '" height="' + CH + '" fill="url(#bmG5)"/><g id="bmRooms"></g></svg>' +
    '<p class="bm-empty" id="bmEmpty">Pick a room above to start.<br>Rooms snap together when they touch.</p></div>' +
    '<div class="bm-edit"><div class="bm-sel" id="bmSelName">No room selected</div>' +
    '<label>Width <input id="bmW" type="number" min="' + MIN + '" max="' + MAX + '" step="0.5" disabled> ft</label>' +
    '<label>Depth <input id="bmD" type="number" min="' + MIN + '" max="' + MAX + '" step="0.5" disabled> ft</label>' +
    '<button type="button" class="skb" id="bmRot" disabled>Rotate</button><button type="button" class="skb" id="bmDel" disabled>Remove</button></div>' +
    '<div class="bm-foot"><span class="bm-tot" id="bmTot">No rooms yet</span><span class="bm-msg" id="bmMsg" role="status"></span>' +
    '<span class="bm-act"><button type="button" class="skb" id="bmClear" disabled>Clear</button><button type="button" class="btn" id="bmReq" disabled>Request this plan</button></span></div>';

  function $(s) { return root.querySelector(s); }
  var svg = $('#bmSvg'), layer = $('#bmRooms'), stage = $('#bmStage'), pal = $('#bmPal'), empty = $('#bmEmpty'),
    inW = $('#bmW'), inD = $('#bmD'), btnRot = $('#bmRot'), btnDel = $('#bmDel'), btnClr = $('#bmClear'), btnReq = $('#bmReq'), selName = $('#bmSelName'), tot = $('#bmTot'), msgEl = $('#bmMsg');

  function msg(t) { msgEl.textContent = t; clearTimeout(msgT); msgT = setTimeout(function () { msgEl.textContent = ''; }, 3600); }
  function pt(e) { var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; var m = svg.getScreenCTM(); return m ? p.matrixTransform(m.inverse()) : { x: 0, y: 0 }; }

  /* ---------- geometry: overlap, attaching, finding a free spot ---------- */
  function hit(a, b) { return a.x < b.x + b.w - EPS && a.x + a.w > b.x + EPS && a.y < b.y + b.d - EPS && a.y + a.d > b.y + EPS; }
  function free(c, ignore) {
    if (c.x < -EPS || c.y < -EPS || c.x + c.w > CW + EPS || c.y + c.d > CH + EPS) return false;
    for (var i = 0; i < rooms.length; i++) if (rooms[i].id !== ignore && hit(c, rooms[i])) return false;
    return true;
  }
  function contact(c, ignore) {                                              // how much of this rectangle's edge touches other rooms
    var s = 0;
    rooms.forEach(function (o) {
      if (o.id === ignore) return;
      var oy = Math.min(c.y + c.d, o.y + o.d) - Math.max(c.y, o.y), ox = Math.min(c.x + c.w, o.x + o.w) - Math.max(c.x, o.x);
      if ((Math.abs(c.x + c.w - o.x) < .01 || Math.abs(o.x + o.w - c.x) < .01) && oy > 0) s += oy;
      if ((Math.abs(c.y + c.d - o.y) < .01 || Math.abs(o.y + o.d - c.y) < .01) && ox > 0) s += ox;
    });
    return s;
  }
  function snapPos(c, ignore) {                                              // snap to the 1 ft grid, then flush to nearby room edges
    var ax = Math.round(c.x), ay = Math.round(c.y), bx = SNAP + 1, by = SNAP + 1;
    rooms.forEach(function (o) {
      if (o.id === ignore) return;
      [o.x + o.w, o.x - c.w, o.x, o.x + o.w - c.w].forEach(function (v) { var dd = Math.abs(v - c.x); if (dd <= SNAP && dd < bx) { bx = dd; ax = v; } });
      [o.y + o.d, o.y - c.d, o.y, o.y + o.d - c.d].forEach(function (v) { var dd = Math.abs(v - c.y); if (dd <= SNAP && dd < by) { by = dd; ay = v; } });
    });
    return { x: Math.max(0, Math.min(CW - c.w, ax)), y: Math.max(0, Math.min(CH - c.d, ay)) };
  }
  function findSpot(w, d, prefer, ignore) {                                  // the free place that touches the most walls, near where the visitor wants it
    var others = rooms.filter(function (r) { return r.id !== ignore; });
    if (!others.length) return { x: Math.round((CW - w) / 2 * 2) / 2, y: Math.round((CH - d) / 2 * 2) / 2 };
    var pc = prefer;
    if (!pc) { var sx = 0, sy = 0, sa = 0; others.forEach(function (o) { var a = o.w * o.d; sx += (o.x + o.w / 2) * a; sy += (o.y + o.d / 2) * a; sa += a; }); pc = { x: sx / sa, y: sy / sa }; }
    var cand = [];
    others.forEach(function (o) {
      [[o.x + o.w, o.y], [o.x + o.w, o.y + o.d - d], [o.x - w, o.y], [o.x - w, o.y + o.d - d], [o.x, o.y + o.d], [o.x + o.w - w, o.y + o.d], [o.x, o.y - d], [o.x + o.w - w, o.y - d]]
        .forEach(function (p) { cand.push({ x: p[0], y: p[1], w: w, d: d }); });
    });
    var best = null;
    cand.forEach(function (c) {
      if (!free(c, ignore)) return;
      var s = contact(c, ignore) * 2 - Math.hypot(c.x + w / 2 - pc.x, c.y + d / 2 - pc.y) * .35;
      if (!best || s > best.s) best = { s: s, x: c.x, y: c.y };
    });
    if (best) return best;
    for (var yy = 0; yy <= CH - d + EPS; yy++) for (var xx = 0; xx <= CW - w + EPS; xx++) {      // last resort: any free gap on the canvas
      var c2 = { x: xx, y: yy, w: w, d: d };
      if (free(c2, ignore)) { var s2 = -Math.hypot(xx + w / 2 - pc.x, yy + d / 2 - pc.y); if (!best || s2 > best.s) best = { s: s2, x: xx, y: yy }; }
    }
    return best;
  }

  /* ---------- drawing a room ---------- */
  function mk(r) {
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'bm-room'); g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('data-id', r.id);
    g.innerHTML = '<title></title><rect class="bm-r"></rect><text class="bm-n"></text><text class="bm-d"></text><g class="bm-m"><rect></rect><rect></rect><rect></rect><rect></rect></g>';
    layer.appendChild(g);
    var h = document.createElement('div');
    h.className = 'bm-hit'; h.tabIndex = 0; h.setAttribute('role', 'button'); h.setAttribute('data-id', r.id);
    stage.appendChild(h);
    els[r.id] = { h: h, g: g, r: g.querySelector('.bm-r'), n: g.querySelector('.bm-n'), d: g.querySelector('.bm-d'), t: g.querySelector('title'), m: [].slice.call(g.querySelectorAll('.bm-m rect')) };
  }
  function paint(r, o) {                                                     // o: optional in-between geometry while a resize animates
    var e = els[r.id]; if (!e) return; o = o || r;
    e.g.setAttribute('transform', 'translate(' + o.x + ' ' + o.y + ')');
    e.h.style.left = (o.x / CW * 100) + '%'; e.h.style.top = (o.y / CH * 100) + '%'; e.h.style.width = (o.w / CW * 100) + '%'; e.h.style.height = (o.d / CH * 100) + '%';
    e.r.setAttribute('width', o.w); e.r.setAttribute('height', o.d); e.r.style.fill = r.c;
    var fs = Math.max(.8, Math.min(1.35, Math.min(o.w, o.d) / 5.2, o.w / (r.n.length * .62)));
    e.n.textContent = o.w >= 3.5 ? r.n : '';
    e.n.setAttribute('x', o.w / 2); e.n.setAttribute('y', o.d / 2 - fs * .12); e.n.style.fontSize = fs + 'px';
    e.d.textContent = (o.w >= 6 && o.d >= 4.5) ? fmt(r.w) + "' × " + fmt(r.d) + "'" : '';
    e.d.setAttribute('x', o.w / 2); e.d.setAttribute('y', o.d / 2 + fs * 1.05); e.d.style.fontSize = fs * .82 + 'px';
    [[0, 0], [o.w, 0], [0, o.d], [o.w, o.d]].forEach(function (p, i) { var m = e.m[i]; m.setAttribute('x', p[0] - .3); m.setAttribute('y', p[1] - .3); m.setAttribute('width', .6); m.setAttribute('height', .6); });
    e.t.textContent = r.n + ', ' + fmt(r.w) + ' by ' + fmt(r.d) + ' ft';
    e.h.setAttribute('aria-label', r.n + ', ' + fmt(r.w) + ' by ' + fmt(r.d) + ' feet. Arrow keys move it, Delete removes it.');
  }
  function totals() {
    var area = Math.round(rooms.reduce(function (s, r) { return s + r.w * r.d; }, 0));
    tot.textContent = rooms.length ? rooms.length + (rooms.length > 1 ? ' rooms' : ' room') + ' · ' + area.toLocaleString() + ' sq ft' : 'No rooms yet';
    empty.hidden = rooms.length > 0; btnClr.disabled = !rooms.length; btnReq.disabled = !rooms.length;
  }
  function select(id) {
    sel = id;
    rooms.forEach(function (r) { els[r.id].g.classList.toggle('sel', r.id === id); });
    var r = id ? get(id) : null;
    selName.textContent = r ? r.n : 'No room selected';
    [inW, inD, btnRot, btnDel].forEach(function (x) { x.disabled = !r; });
    inW.value = r ? fmt(r.w) : ''; inD.value = r ? fmt(r.d) : '';
    if (r) layer.appendChild(els[r.id].g);                                   // bring the selected room to the front
  }
  function uniqueName(t) {
    var n = 0, name = t.n;
    while (rooms.some(function (r) { return r.n === name; })) { n++; name = t.n + ' (' + (n + 1) + ')'; }
    return name;
  }

  /* ---------- add, move, resize, remove ---------- */
  function addType(k, at) {
    var t = typeOf(k); if (!t) return null;
    var spot;
    if (at) { var c = { x: at.x - t.w / 2, y: at.y - t.d / 2, w: t.w, d: t.d }, s = snapPos(c, 0); c.x = s.x; c.y = s.y; spot = free(c, 0) ? c : findSpot(t.w, t.d, at, 0); }
    else spot = findSpot(t.w, t.d, null, 0);
    if (!spot) { msg('No space left on the canvas. Remove or shrink a room first.'); return null; }
    var r = { id: nextId++, k: k, n: uniqueName(t), c: t.c, x: spot.x, y: spot.y, w: t.w, d: t.d };
    rooms.push(r); mk(r); paint(r); select(r.id); totals();
    if (G && !RM) G.from(els[r.id].g, { opacity: 0, duration: .35, ease: 'power2.out' });
    return r;
  }
  function removeRoom(id) {
    var r = get(id); if (!r) return;
    var e = els[id], done = function () { if (e.g.parentNode) e.g.parentNode.removeChild(e.g); if (e.h.parentNode) e.h.parentNode.removeChild(e.h); };
    rooms.splice(rooms.indexOf(r), 1); delete els[id];
    e.h.style.pointerEvents = 'none';
    if (G && !RM) G.to(e.g, { opacity: 0, duration: .2, onComplete: done }); else done();
    select(rooms.length ? rooms[rooms.length - 1].id : null); totals();
  }
  function resizeTo(r, w, d, center) {
    var x = center ? r.x + (r.w - w) / 2 : r.x, y = center ? r.y + (r.d - d) / 2 : r.y;
    x = Math.max(0, Math.min(CW - w, Math.round(x * 2) / 2)); y = Math.max(0, Math.min(CH - d, Math.round(y * 2) / 2));
    var c = { x: x, y: y, w: w, d: d };
    if (!free(c, r.id)) {
      var s = findSpot(w, d, { x: r.x + r.w / 2, y: r.y + r.d / 2 }, r.id);
      if (!s) { msg('There is no room for that size here. Move or shrink another room.'); inW.value = fmt(r.w); inD.value = fmt(r.d); return false; }
      c.x = s.x; c.y = s.y;
    }
    var from = { x: r.x, y: r.y, w: r.w, d: r.d };
    r.x = c.x; r.y = c.y; r.w = w; r.d = d;
    if (G && !RM) { G.killTweensOf(from); G.to(from, { x: r.x, y: r.y, w: r.w, d: r.d, duration: .35, ease: 'power3.out', onUpdate: function () { paint(r, from); }, onComplete: function () { paint(r); } }); }
    else paint(r);
    totals(); return true;
  }

  /* ---------- the size boxes ---------- */
  function onSize() {
    var r = sel && get(sel); if (!r) return;
    var w = parseFloat(inW.value), d = parseFloat(inD.value);
    if (!(w >= MIN && w <= MAX && d >= MIN && d <= MAX)) return;             // wait until the typed number is valid
    if (Math.abs(w - r.w) < EPS && Math.abs(d - r.d) < EPS) return;
    resizeTo(r, w, d, false);
  }
  function clampBox(inp) { var v = parseFloat(inp.value); if (isNaN(v)) { var r = sel && get(sel); if (r) inp.value = fmt(inp === inW ? r.w : r.d); return; } inp.value = fmt(Math.max(MIN, Math.min(MAX, v))); onSize(); }
  inW.addEventListener('input', onSize); inD.addEventListener('input', onSize);
  inW.addEventListener('change', function () { clampBox(inW); }); inD.addEventListener('change', function () { clampBox(inD); });
  btnRot.addEventListener('click', function () { var r = sel && get(sel); if (r && resizeTo(r, r.d, r.w, true)) { inW.value = fmt(r.w); inD.value = fmt(r.d); } });
  btnDel.addEventListener('click', function () { if (sel) removeRoom(sel); });
  btnClr.addEventListener('click', function () { rooms.slice().forEach(function (r) { var e = els[r.id]; if (e) { if (e.g.parentNode) e.g.parentNode.removeChild(e.g); if (e.h.parentNode) e.h.parentNode.removeChild(e.h); } }); rooms = []; els = {}; select(null); totals(); msg('Cleared.'); });
  btnReq.addEventListener('click', function () {
    if (!rooms.length) return;
    var area = Math.round(rooms.reduce(function (s, r) { return s + r.w * r.d; }, 0));
    var line = 'My layout from the home page builder (' + rooms.length + ' room' + (rooms.length > 1 ? 's' : '') + ', about ' + area + ' sq ft): ' + rooms.map(function (r) { return r.n + " " + fmt(r.w) + "' x " + fmt(r.d) + "'"; }).join('; ') + '.';
    var m = document.getElementById('m'); if (m) m.value = (m.value ? m.value + '\n\n' : '') + line;
    location.hash = '#contact';
  });

  /* ---------- dragging a placed room ---------- */
  stage.addEventListener('pointerdown', function (e) {
    var g = e.target.closest && e.target.closest('.bm-hit');
    if (!g) { if (sel) select(null); return; }
    if (e.button > 0) return;
    var id = +g.getAttribute('data-id'), r = get(id); if (!r) return;
    select(id);
    var p = pt(e); drag = { id: id, ox: p.x - r.x, oy: p.y - r.y, sx: r.x, sy: r.y, moved: false, g: g };
    try { g.setPointerCapture(e.pointerId); } catch (x) {}
    e.preventDefault();
  });
  stage.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var r = get(drag.id); if (!r) return;
    var p = pt(e), s = snapPos({ x: p.x - drag.ox, y: p.y - drag.oy, w: r.w, d: r.d }, r.id);
    if (Math.abs(s.x - r.x) > 0 || Math.abs(s.y - r.y) > 0) drag.moved = true;
    r.x = s.x; r.y = s.y; paint(r);
    els[r.id].g.classList.toggle('bad', !free(r, r.id));
  });
  function endDrag() {
    if (!drag) return;
    var r = get(drag.id);
    if (r) {
      els[r.id].g.classList.remove('bad');
      if (!free(r, r.id)) { r.x = drag.sx; r.y = drag.sy; paint(r); msg('Rooms cannot overlap. Drag it next to the other room instead.'); }
    }
    drag = null;
  }
  stage.addEventListener('pointerup', endDrag); stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('keydown', function (e) {                           // keyboard: arrows move the focused room, Delete removes it
    var g = e.target.closest && e.target.closest('.bm-hit'); if (!g) return;
    var id = +g.getAttribute('data-id'), r = get(id); if (!r) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(id); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeRoom(id); return; }
    var step = e.shiftKey ? 5 : 1, dx = 0, dy = 0;
    if (e.key === 'ArrowLeft') dx = -step; else if (e.key === 'ArrowRight') dx = step; else if (e.key === 'ArrowUp') dy = -step; else if (e.key === 'ArrowDown') dy = step; else return;
    e.preventDefault(); select(id);
    var c = { x: Math.max(0, Math.min(CW - r.w, r.x + dx)), y: Math.max(0, Math.min(CH - r.d, r.y + dy)), w: r.w, d: r.d };
    if (free(c, r.id)) { r.x = c.x; r.y = c.y; paint(r); } else msg('Rooms cannot overlap.');
    var ng = els[id] && els[id].h; if (ng) ng.focus();
  });

  /* ---------- the room tiles: click or tap to add, or drag onto the canvas ---------- */
  pal.addEventListener('click', function (e) {
    var t = e.target.closest('.bm-t'); if (!t) return;
    if (suppressClick) { suppressClick = false; return; }
    addType(t.getAttribute('data-k'));
  });
  pal.addEventListener('pointerdown', function (e) {
    var t = e.target.closest('.bm-t'); if (!t || e.button > 0 || e.pointerType === 'touch') return;   // touch just taps: swiping the row must still scroll
    pd = { k: t.getAttribute('data-k'), x: e.clientX, y: e.clientY, moved: false, ghost: null };
    document.addEventListener('pointermove', onPalMove); document.addEventListener('pointerup', onPalUp); document.addEventListener('pointercancel', onPalUp);
  });
  function onPalMove(e) {
    if (!pd) return;
    if (!pd.moved && Math.hypot(e.clientX - pd.x, e.clientY - pd.y) > 7) {
      pd.moved = true;
      var t = typeOf(pd.k), ppf = svg.getBoundingClientRect().width / CW, gh = document.createElement('div');
      gh.className = 'bm-ghost'; gh.textContent = t.n; gh.style.width = t.w * ppf + 'px'; gh.style.height = t.d * ppf + 'px'; gh.style.background = t.c;
      document.body.appendChild(gh); pd.ghost = gh;
    }
    if (pd.ghost) { pd.ghost.style.left = e.clientX + 'px'; pd.ghost.style.top = e.clientY + 'px'; }
  }
  function onPalUp(e) {
    document.removeEventListener('pointermove', onPalMove); document.removeEventListener('pointerup', onPalUp); document.removeEventListener('pointercancel', onPalUp);
    if (!pd) return;
    var d = pd; pd = null;
    if (d.ghost && d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost);
    if (!d.moved) return;
    suppressClick = true; setTimeout(function () { suppressClick = false; }, 60);
    var r = svg.getBoundingClientRect();
    if (e.type === 'pointerup' && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) addType(d.k, pt(e));
  }

  select(null); totals();
  window.UBCBuilder = {                                                      // read-only view, used for testing
    rooms: function () { return rooms.map(function (r) { return { id: r.id, k: r.k, n: r.n, x: r.x, y: r.y, w: r.w, d: r.d }; }); },
    size: { w: CW, d: CH }
  };
})();
