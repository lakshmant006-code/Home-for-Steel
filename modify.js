/* Modify a plan: the standard plan is shown as drawn; people drag over any area (or tap a room), choose or describe a change, and see it redrawn.
   Rooms below were read from the drawing: pixel box on the image + the dimensions printed on the plan. */
(function () {
  'use strict';
  var root = document.getElementById('mod2');
  if (!root) return;
  var G = window.gsap, RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var $ = function (s, r) { return (r || root).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || root).querySelectorAll(s)); };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var fx = function (fn) { if (G && !RM) fn(); };
  var F = function (ft, inch) { return ft + (inch || 0) / 12; };
  function fmt(v) { var f = Math.floor(v + 1e-9), i = Math.round((v - f) * 12); if (i === 12) { f++; i = 0; } return f + "'-" + i + '"'; }

  /* ---- the standard plan (image 1448 x 1086); b = [x0,y0,x1,y1] in image pixels, d = [width ft, depth ft] as printed ---- */
  var STD = {
    src: 'assets/plans/ranch-2520.webp', dets: 'assets/plans/ranch-2520.detections.json', W: 1448, H: 1086, pxFtX: 20.4, pxFtY: 17.3,
    name: 'Ranch 2520 with garage', meta: '3 bed · 2 bath · 2-car garage · 2,520 sq ft living · 2,897 sq ft total',
    rooms: [
      { n: 'Bath 1', b: [80, 75, 355, 285], d: [F(9, 4), F(9, 10)] },
      { n: 'Bedroom 1', b: [355, 75, 625, 375], d: [F(13), F(14, 2)] },
      { n: 'Master closet', b: [80, 285, 280, 515], d: [F(12, 10), F(13, .5)] },
      { n: 'Utility', b: [280, 375, 440, 515], d: [F(7, 4), F(6, 10)] },
      { n: 'Entry', b: [440, 375, 625, 515], d: [F(6, 8.5), F(6, 10)] },
      { n: 'Garage', b: [80, 515, 530, 975], d: [F(21), F(22)] },
      { n: 'Pantry', b: [530, 515, 680, 740], d: [F(7), F(10, 9)] },
      { n: 'Kitchen', b: [625, 205, 860, 437], d: [F(11, 4), F(11, 6)] },
      { n: 'Dining', b: [860, 205, 1050, 437], d: [F(9, 4), F(11, 6)] },
      { n: 'Great room', b: [680, 437, 1050, 740], d: [F(18), F(15)] },
      { n: 'Rear porch', b: [650, 75, 1050, 205], d: [F(20), F(6)] },
      { n: 'Bedroom 2', b: [1050, 75, 1290, 300], d: [F(11, 4), F(11)] },
      { n: 'Hall', b: [1050, 300, 1125, 515], d: [F(3, 10), F(11, 4)] },
      { n: 'Linen', b: [1125, 310, 1165, 355], d: [F(2), F(2)] },
      { n: 'Closet 2', b: [1165, 305, 1290, 355], d: [F(5, 9), F(2, 2)] },
      { n: 'Bath 2', b: [1125, 360, 1330, 465], d: [F(9, 6), F(5)] },
      { n: 'Closet 3', b: [1125, 465, 1290, 515], d: [F(7, 6), F(2)] },
      { n: 'Bedroom 3', b: [1050, 515, 1290, 740], d: [F(11, 4), F(11)] },
      { n: 'Front porch', b: [870, 740, 1070, 880], d: [F(10), F(5)] }
    ]
  };
  var CHIPS = ['Make it bigger', 'Add a window', 'Remove a window', 'Add a door', 'Add a closet', 'Add an island', 'Open it up'];

  root.innerHTML =
    '<div class="m2">' +
    '<div class="m2-win">' +
    '<div class="m2-bar"><i class="d r"></i><i class="d y"></i><i class="d g"></i>' +
    '<span class="m2-own"><label class="skb" for="m2File">Use my own plan</label><input id="m2File" type="file" accept="image/*" hidden><button type="button" class="skb" id="m2Reset" hidden>Back to the standard plan</button><button type="button" class="skb" id="m2DetBtn" hidden>Show what we detected</button></span>' +
    '<span class="m2-hint">Drag over an area to change it</span></div>' +
    '<div class="m2-sel" id="m2Sel"><div><span id="m2SelTx"></span><button type="button" id="m2Clear">Clear</button></div></div>' +
    '<div class="m2-body">' +
    '<div class="m2-stage" id="m2Stage"><div class="m2-fig" id="m2Fig"><img id="m2Img" alt="Floor plan to modify" draggable="false"><svg id="m2Svg" aria-hidden="true"></svg></div><div class="m2-box" id="m2Box" hidden></div></div>' +
    '<aside class="m2-side">' +
    '<div class="m2-quote" id="m2Quote" hidden><b id="m2QT"></b><span id="m2QS"></span></div>' +
    '<div class="m2-lbl" id="m2RL">Or tap a room</div><div class="m2-rooms" id="m2Rooms"></div>' +
    '<div class="m2-lbl">Quick changes</div><div class="m2-chips" id="m2Chips">' + CHIPS.map(function (c) { return '<button type="button" disabled>' + c + '</button>'; }).join('') + '</div>' +
    '<ol class="m2-list" id="m2List"><li class="empty">Your changes will be listed here.</li></ol>' +
    '<form class="m2-ask" id="m2Ask" autocomplete="off"><input id="m2In" type="text" placeholder="Ask for anything else…" aria-label="Describe a change"><button type="submit" class="skb red">Add</button></form>' +
    '<button type="button" class="btn" id="m2Apply" disabled>Apply my changes</button>' +
    '<p class="mut" id="m2Note">Demo: changes are redrawn locally. Your real request goes to our team.</p>' +
    '</aside></div></div></div>';

  var stage = $('#m2Stage'), svg = $('#m2Svg'), img = $('#m2Img'), box = $('#m2Box'), selBar = $('#m2Sel'), list = $('#m2List'),
    apply = $('#m2Apply'), note = $('#m2Note'), input = $('#m2In');
  var dets = [], fig = STD, rooms = STD.rooms, sel = null, changes = [], drag = null, sent = false, objUrl = null;

  function toPlan(cx, cy) { var pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy; var m = svg.getScreenCTM(); return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 }; }
  function toClient(x, y) { var pt = svg.createSVGPoint(); pt.x = x; pt.y = y; return pt.matrixTransform(svg.getScreenCTM()); }
  function R(r) { return { x0: r.b[0], y0: r.b[1], x1: r.b[2], y1: r.b[3] }; }

  /* ---------- load a plan (standard or the visitor's own) ---------- */
  function load(f) {
    fig = f; rooms = f.rooms; changes = []; sent = false;
    $('#m2Reset').hidden = f === STD;
    fx(function () { G.set('#m2Fig', { clipPath: 'inset(0 100% 0 0)' }); });   // start hidden: no flash of the finished plan
    img.onload = function () {
      svg.setAttribute('viewBox', '0 0 ' + fig.W + ' ' + fig.H);
      svg.innerHTML = rooms.map(function (r, i) { var b = R(r); return '<rect class="rm" data-i="' + i + '" x="' + b.x0 + '" y="' + b.y0 + '" width="' + (b.x1 - b.x0) + '" height="' + (b.y1 - b.y0) + '"/>'; }).join('') + '<g id="m2Dets"></g><g id="m2Adds"></g><g id="m2Marks"></g>'; renderDets();
      fx(function () {
        G.fromTo('#m2Fig', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.4, ease: 'power3.inOut', clearProps: 'clipPath' });
      });
      syncBox();
    };
    img.src = f.src;
    loadDets(f);
    clearSel(); renderList(); renderRooms();
    apply.textContent = 'Apply my changes'; apply.disabled = true;
    note.textContent = f === STD ? 'Demo: changes are redrawn locally. Your real request goes to our team.' : 'Room detection for uploaded drawings needs our plan reader. For now, drag over any area and describe the change.';
  }

  /* ---------- plan-detection model output (doors, windows, walls found on the drawing) ---------- */
  function loadDets(f) {
    dets = []; var btn = $('#m2DetBtn'); btn.hidden = true; svg.classList.remove('show-dets'); btn.textContent = 'Show what we detected';
    function got(j) {
      if (fig !== f) return;
      dets = ((j && j.detections) || []).map(function (d) { return { cls: d.cls, conf: d.conf, b: d.box }; });
      renderDets(); if (dets.length) { btn.hidden = false; note.textContent = 'We found ' + summ(dets) + ' on this plan, so changes snap to the real walls, doors and windows.'; }
    }
    if (f.dets) { fetch(f.dets).then(function (r) { return r.json(); }).then(got).catch(function () {}); }
    else if (window.UBC_DETECT_URL && f.file) {                    // optional: a hosted copy of the detection model reads uploaded plans
      var fd = new FormData(); fd.append('image', f.file); note.textContent = 'Reading your plan…';
      fetch(window.UBC_DETECT_URL, { method: 'POST', body: fd }).then(function (r) { return r.json(); }).then(got)
        .catch(function () { note.textContent = 'We could not read that plan automatically. Drag over any area and describe the change.'; });
    }
  }
  function renderDets() {
    var g = $('#m2Dets', svg); if (!g) return;
    g.innerHTML = dets.map(function (d, i) { var b = d.b; return '<rect class="det" data-c="' + d.cls.replace(/\s/g, '') + '" data-i="' + i + '" x="' + b[0] + '" y="' + b[1] + '" width="' + (b[2] - b[0]) + '" height="' + (b[3] - b[1]) + '" rx="3"/>'; }).join('');
  }
  function elsIn(x0, y0, x1, y1) {
    return dets.filter(function (d) {
      var b = { x0: d.b[0], y0: d.b[1], x1: d.b[2], y1: d.b[3] }, a = (b.x1 - b.x0) * (b.y1 - b.y0) || 1, mx = (b.x0 + b.x1) / 2, my = (b.y0 + b.y1) / 2;
      return (mx >= x0 && mx <= x1 && my >= y0 && my <= y1) || overlap(b, x0, y0, x1, y1) / a >= 0.5;
    });
  }
  function summ(els) {
    var c = { door: 0, window: 0, wall: 0 }, p = [];
    els.forEach(function (d) { if (/Door/.test(d.cls)) c.door++; else if (d.cls === 'Window') c.window++; else if (/Wall/.test(d.cls)) c.wall++; });
    if (c.door) p.push(c.door + (c.door > 1 ? ' doors' : ' door'));
    if (c.window) p.push(c.window + (c.window > 1 ? ' windows' : ' window'));
    if (c.wall) p.push(c.wall + (c.wall > 1 ? ' wall segments' : ' wall segment'));
    return p.join(' · ');
  }
  function wallNear(s, cx, cy) {                                  // closest detected wall to the selection
    var best = null, bd = 1e9, pad = 70;
    dets.forEach(function (d) {
      if (!/Wall/.test(d.cls)) return; var b = d.b;
      if (b[2] < s.x0 - pad || b[0] > s.x1 + pad || b[3] < s.y0 - pad || b[1] > s.y1 + pad) return;
      var qx = Math.max(b[0], Math.min(cx, b[2])), qy = Math.max(b[1], Math.min(cy, b[3])), dd = Math.hypot(qx - cx, qy - cy);
      if (dd < bd) { bd = dd; best = d; }
    });
    return best;
  }
  function innerWalls(s) {                                        // detected walls inside the selection, leaving the outside walls of the house alone
    var walls = dets.filter(function (d) { return /Wall/.test(d.cls); });
    if (!walls.length) return [];
    var E = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    walls.forEach(function (d) { E.x0 = Math.min(E.x0, d.b[0]); E.y0 = Math.min(E.y0, d.b[1]); E.x1 = Math.max(E.x1, d.b[2]); E.y1 = Math.max(E.y1, d.b[3]); });
    return elsIn(s.x0, s.y0, s.x1, s.y1).filter(function (d) {
      if (!/Wall/.test(d.cls)) return false;
      var b = d.b, hz = (b[2] - b[0]) >= (b[3] - b[1]), mx = (b[0] + b[2]) / 2, my = (b[1] + b[3]) / 2;
      return hz ? (my > E.y0 + 36 && my < E.y1 - 36) : (mx > E.x0 + 36 && mx < E.x1 - 36);
    });
  }
  function renderRooms() {
    $('#m2RL').hidden = !rooms.length;
    $('#m2Rooms').innerHTML = rooms.map(function (r, i) { return '<button type="button" data-i="' + i + '">' + esc(r.n) + '</button>'; }).join('');
    fx(function () { G.from('#m2Rooms button', { y: 10, opacity: 0, duration: 0.45, stagger: 0.025, ease: 'power3.out', delay: 0.5 }); });
  }
  $('#m2Rooms').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { var r = R(rooms[+b.dataset.i]); select(r.x0, r.y0, r.x1, r.y1); } });
  $('#m2File').addEventListener('change', function () {
    var f = this.files[0]; if (!f) return;
    if (objUrl) URL.revokeObjectURL(objUrl);
    objUrl = URL.createObjectURL(f);
    var t = new Image();
    t.onload = function () { load({ src: objUrl, W: t.naturalWidth, H: t.naturalHeight, name: f.name, rooms: [], file: f }); };
    t.onerror = function () { note.textContent = 'That file could not be read as an image. Try a PNG or JPG of your plan.'; };
    t.src = objUrl;
  });
  $('#m2Reset').onclick = function () { load(STD); };
  $('#m2DetBtn').onclick = function () { var on = svg.classList.toggle('show-dets'); this.textContent = on ? 'Hide detected parts' : 'Show what we detected'; };

  /* ---------- drag to select ---------- */
  function stageXY(e) { var b = stage.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
  stage.addEventListener('pointerdown', function (e) {
    if (e.button > 0) return;
    stage.setPointerCapture(e.pointerId);
    var p = stageXY(e); drag = { sx: p.x, sy: p.y, cx: e.clientX, cy: e.clientY, moved: false };
    box.hidden = false; box.classList.remove('done'); box.style.cssText = 'left:' + p.x + 'px;top:' + p.y + 'px;width:0;height:0';
  });
  stage.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var p = stageXY(e), x = Math.min(p.x, drag.sx), y = Math.min(p.y, drag.sy), w = Math.abs(p.x - drag.sx), h = Math.abs(p.y - drag.sy);
    if (w + h > 6) drag.moved = true;
    box.style.left = x + 'px'; box.style.top = y + 'px'; box.style.width = w + 'px'; box.style.height = h + 'px';
    var a = toPlan(Math.min(e.clientX, drag.cx), Math.min(e.clientY, drag.cy)), z = toPlan(Math.max(e.clientX, drag.cx), Math.max(e.clientY, drag.cy));
    hilite(a.x, a.y, z.x, z.y);
  });
  stage.addEventListener('pointerup', function (e) {
    if (!drag) return; var d = drag; drag = null;
    var a = toPlan(Math.min(e.clientX, d.cx), Math.min(e.clientY, d.cy)), z = toPlan(Math.max(e.clientX, d.cx), Math.max(e.clientY, d.cy));
    if (!d.moved) { var hit = roomAt(a.x, a.y); if (hit) { var r = R(hit); select(r.x0, r.y0, r.x1, r.y1); } else clearSel(); return; }
    select(a.x, a.y, z.x, z.y);
  });
  stage.addEventListener('pointercancel', function () { drag = null; });

  function roomAt(x, y) {
    var best = null, ba = 1e12;                                   // smallest room under the point wins (closets inside rooms)
    rooms.forEach(function (r) { var b = R(r), a = (b.x1 - b.x0) * (b.y1 - b.y0); if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && a < ba) { best = r; ba = a; } });
    return best;
  }
  function overlap(b, x0, y0, x1, y1) { var w = Math.min(b.x1, x1) - Math.max(b.x0, x0), h = Math.min(b.y1, y1) - Math.max(b.y0, y0); return w > 0 && h > 0 ? w * h : 0; }
  function hits(x0, y0, x1, y1) {
    return rooms.filter(function (r) { var b = R(r), a = (b.x1 - b.x0) * (b.y1 - b.y0); return overlap(b, x0, y0, x1, y1) / a >= 0.3; });
  }
  function hilite(x0, y0, x1, y1) {
    var on = hits(x0, y0, x1, y1);
    $$('.rm', svg).forEach(function (g) { g.classList.toggle('hit', on.indexOf(rooms[+g.dataset.i]) > -1); });
  }

  function select(x0, y0, x1, y1) {
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(fig.W, x1); y1 = Math.min(fig.H, y1);
    if (x1 - x0 < 14 || y1 - y0 < 14) { clearSel(); return; }
    var hs = hits(x0, y0, x1, y1), label, dim;
    label = hs.length === 1 ? hs[0].n : hs.length > 1 ? hs.length + ' rooms' : (fig === STD ? 'Open area' : 'Selected area');
    if (hs.length === 1) dim = fmt(hs[0].d[0]) + ' × ' + fmt(hs[0].d[1]);
    else if (fig === STD) dim = '≈ ' + Math.round((x1 - x0) / fig.pxFtX) + "' × " + Math.round((y1 - y0) / fig.pxFtY) + "'";
    else dim = '';
    sel = { x0: x0, y0: y0, x1: x1, y1: y1, rooms: hs, label: label, dim: dim, els: elsIn(x0, y0, x1, y1) };
    var found = summ(sel.els);
    $$('.det', svg).forEach(function (r) { r.classList.toggle('on', sel.els.indexOf(dets[+r.dataset.i]) > -1); });
    hilite(x0, y0, x1, y1); syncBox(); box.hidden = false; box.classList.remove('done'); void box.offsetWidth; box.classList.add('done');
    var names = hs.length > 1 ? hs.map(function (r) { return r.n; }).join(', ') : '';
    $('#m2SelTx').textContent = 'Selected · ' + label + (dim ? ' · ' + dim : '') + (found ? ' · ' + found : '');
    selBar.classList.add('on');
    $('#m2QT').textContent = label; $('#m2QS').textContent = (names || dim || 'Your marked area') + (found ? ' · ' + found : '');
    var q = $('#m2Quote'), was = q.hidden; q.hidden = false;
    $$('#m2Chips button').forEach(function (c) { c.disabled = false; });
    var hint = $('.m2-hint'); hint.classList.add('ok'); hint.innerHTML = 'Pick a change, or describe your own';
    fx(function () {
      G.fromTo(box, { scale: 1.03 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' });
      G.fromTo(q, { x: was ? 40 : 14, opacity: was ? 0 : 0.4 }, { x: 0, opacity: 1, duration: 0.7, ease: 'expo.out' });
      G.from('#m2Chips button', { y: 10, opacity: 0, scale: 0.9, duration: 0.5, stagger: 0.05, ease: 'back.out(2)', clearProps: 'all', overwrite: true });
    });
  }
  function syncBox() {
    if (!sel || !svg.getScreenCTM()) return;
    var a = toClient(sel.x0, sel.y0), z = toClient(sel.x1, sel.y1), s = stage.getBoundingClientRect();
    box.style.left = (a.x - s.left) + 'px'; box.style.top = (a.y - s.top) + 'px'; box.style.width = (z.x - a.x) + 'px'; box.style.height = (z.y - a.y) + 'px';
  }
  function clearSel() {
    sel = null; box.hidden = true; box.classList.remove('done'); selBar.classList.remove('on'); $('#m2Quote').hidden = true;
    $$('.rm', svg).forEach(function (g) { g.classList.remove('hit'); });
    $$('.det', svg).forEach(function (g) { g.classList.remove('on'); });
    $$('#m2Chips button').forEach(function (c) { c.disabled = true; });
    var hint = $('.m2-hint'); hint.classList.remove('ok'); hint.innerHTML = 'Drag over an area to change it';
  }
  $('#m2Clear').onclick = clearSel;
  if (window.ResizeObserver) new ResizeObserver(syncBox).observe(stage); else window.addEventListener('resize', syncBox);

  /* ---------- changes ---------- */
  function addChange(text) {
    text = String(text || '').trim();
    if (!sel) { note.textContent = 'Drag over the part of the plan you want changed first.'; fx(function () { G.fromTo('#m2Stage', { x: -6 }, { x: 0, duration: 0.6, ease: 'elastic.out(1.2,.3)' }); }); return; }
    var n = changes.length + 1, c = { n: n, t: text, sel: sel, done: false };
    changes.push(c);
    var m = document.createElementNS(NS, 'g'); m.setAttribute('class', 'mk');
    m.innerHTML = '<circle cx="' + sel.x0 + '" cy="' + sel.y0 + '" r="17"/><text x="' + sel.x0 + '" y="' + (sel.y0 + 6) + '" text-anchor="middle">' + n + '</text>';
    $('#m2Marks', svg).appendChild(m); c.mk = m;
    fx(function () { G.from(m, { scale: 0, transformOrigin: sel.x0 + 'px ' + sel.y0 + 'px', duration: 0.6, ease: 'back.out(3)' }); });
    renderList(true); apply.disabled = false; input.value = '';
    note.textContent = changes.length + ' change' + (changes.length > 1 ? 's' : '') + ' ready. Select another area, or apply them.';
  }
  function renderList(anim) {
    if (!changes.length) { list.innerHTML = '<li class="empty">Your changes will be listed here.</li>'; apply.disabled = true; return; }
    list.innerHTML = changes.map(function (c) { return '<li class="' + (c.done ? 'ok' : '') + '"><i>' + c.n + '</i><span><b>' + esc(c.sel.label) + '</b>' + esc(c.t) + '<em></em></span></li>'; }).join('');
    changes.forEach(function (c, k) { c.li = list.children[k]; });
    if (anim) fx(function () { G.from(list.lastChild, { x: 30, opacity: 0, duration: 0.6, ease: 'expo.out' }); });
  }
  $('#m2Chips').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b && !b.disabled) addChange(b.textContent); });
  $('#m2Ask').addEventListener('submit', function (e) { e.preventDefault(); if (input.value.trim()) addChange(input.value); });

  /* ---------- redraw on the plan ---------- */
  function glow(el) { if (!el) return; el.classList.add('glow'); setTimeout(function () { el.classList.remove('glow'); }, 1500); }
  function sharedEdges(a, b) {
    var out = [], A = R(a), B = R(b), T = 16;
    if (Math.abs(A.x1 - B.x0) < T || Math.abs(B.x1 - A.x0) < T) { var x = Math.abs(A.x1 - B.x0) < T ? (A.x1 + B.x0) / 2 : (B.x1 + A.x0) / 2, y0 = Math.max(A.y0, B.y0), y1 = Math.min(A.y1, B.y1); if (y1 - y0 > 30) out.push([x, y0 + 8, x, y1 - 8]); }
    if (Math.abs(A.y1 - B.y0) < T || Math.abs(B.y1 - A.y0) < T) { var y = Math.abs(A.y1 - B.y0) < T ? (A.y1 + B.y0) / 2 : (B.y1 + A.y0) / 2, x0 = Math.max(A.x0, B.x0), x1 = Math.min(A.x1, B.x1); if (x1 - x0 > 30) out.push([x0 + 8, y, x1 - 8, y]); }
    return out;
  }
  function draw(c) {
    var t = c.t.toLowerCase(), s = c.sel, add = $('#m2Adds', svg), cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2, w = s.x1 - s.x0, h = s.y1 - s.y0, info = '';
    function mk(html) { var n = document.createElementNS(NS, 'g'); n.setAttribute('class', 'mn'); n.innerHTML = html; add.appendChild(n); fx(function () { G.from(n, { opacity: 0, duration: 0.7 }); }); glow(n); return n; }
    if (/bigger|larger|expand|wider|enlarge|more space/.test(t)) {
      var f = 1.12, targets = s.rooms.length ? s.rooms.map(function (r) { return { b: R(r), n: r.n, d: r.d }; }) : [{ b: s, n: s.label, d: null }];
      targets.forEach(function (o) {
        var b = o.b, bw = b.x1 - b.x0, bh = b.y1 - b.y0, nx = b.x0 - bw * (f - 1) / 2, ny = b.y0 - bh * (f - 1) / 2, nw = bw * f, nh = bh * f;
        var r = document.createElementNS(NS, 'rect'); r.setAttribute('class', 'grow'); r.setAttribute('x', nx); r.setAttribute('y', ny); r.setAttribute('width', nw); r.setAttribute('height', nh); r.setAttribute('rx', 6);
        add.appendChild(r);
        fx(function () { G.from(r, { attr: { x: b.x0, y: b.y0, width: bw, height: bh }, duration: 1.2, ease: 'elastic.out(1,.6)' }); });
        glow(r);
        if (o.d) info += o.n + ' ' + fmt(o.d[0]) + ' × ' + fmt(o.d[1]) + ' → ' + fmt(o.d[0] * f) + ' × ' + fmt(o.d[1] * f) + '. ';
      });
    } else if (/(remove|delete|close|fill).*window|window.*(remove|delete)/.test(t)) {
      var ws = (s.els || []).filter(function (d) { return d.cls === 'Window'; });
      if (ws.length) {
        ws.forEach(function (d) {                                  // wipe the window symbol and draw solid wall in its place
          var bb = d.b, hz = (bb[2] - bb[0]) >= (bb[3] - bb[1]), mx = (bb[0] + bb[2]) / 2, my = (bb[1] + bb[3]) / 2;
          mk('<rect x="' + (bb[0] - 3) + '" y="' + (bb[1] - 3) + '" width="' + (bb[2] - bb[0] + 6) + '" height="' + (bb[3] - bb[1] + 6) + '" fill="#fff"/>' +
             (hz ? '<line x1="' + bb[0] + '" y1="' + my + '" x2="' + bb[2] + '" y2="' + my + '"' : '<line x1="' + mx + '" y1="' + bb[1] + '" x2="' + mx + '" y2="' + bb[3] + '"') + ' stroke="#13233a" stroke-width="7"/>');
        });
        info = ws.length + (ws.length > 1 ? ' windows' : ' window') + ' closed up.';
      } else { mk('<rect x="' + s.x0 + '" y="' + s.y0 + '" width="' + w + '" height="' + h + '" rx="8" fill="none" stroke="#6d4cff" stroke-width="3" stroke-dasharray="10 8"/>'); info = 'No window found in this area.'; }
    } else if (/window/.test(t)) {
      var L = Math.min(110, Math.max(60, w * 0.4)), wl = wallNear(s, cx, cy);
      if (wl) {                                                    // snap onto the closest detected wall
        var wb = wl.b, whz = (wb[2] - wb[0]) >= (wb[3] - wb[1]);
        if (whz) { var wx = Math.max(wb[0] + L / 2, Math.min(cx, wb[2] - L / 2)), wy = (wb[1] + wb[3]) / 2;
          mk('<rect x="' + (wx - L / 2) + '" y="' + (wy - 8) + '" width="' + L + '" height="16" fill="#fff" stroke="#13233a" stroke-width="3"/><line x1="' + (wx - L / 2) + '" y1="' + wy + '" x2="' + (wx + L / 2) + '" y2="' + wy + '" stroke="#2e6a8e" stroke-width="3"/>');
        } else { var vx = (wb[0] + wb[2]) / 2, vy = Math.max(wb[1] + L / 2, Math.min(cy, wb[3] - L / 2));
          mk('<rect x="' + (vx - 8) + '" y="' + (vy - L / 2) + '" width="16" height="' + L + '" fill="#fff" stroke="#13233a" stroke-width="3"/><line x1="' + vx + '" y1="' + (vy - L / 2) + '" x2="' + vx + '" y2="' + (vy + L / 2) + '" stroke="#2e6a8e" stroke-width="3"/>'); }
        info = 'Window placed on the wall.';
      } else {
        mk('<rect x="' + (cx - L / 2) + '" y="' + (s.y0 - 8) + '" width="' + L + '" height="16" fill="#fff" stroke="#13233a" stroke-width="3"/><line x1="' + (cx - L / 2) + '" y1="' + s.y0 + '" x2="' + (cx + L / 2) + '" y2="' + s.y0 + '" stroke="#2e6a8e" stroke-width="3"/>');
      }
    } else if (/door|entry|opening/.test(t)) {
      var d = Math.min(70, Math.max(46, Math.min(w, h) * 0.45)), dl = wallNear(s, cx, cy);
      if (dl) {                                                    // cut a door into the closest detected wall, swinging into the selected room
        var db = dl.b, dhz = (db[2] - db[0]) >= (db[3] - db[1]);
        if (dhz) { var dx = Math.max(db[0] + d / 2, Math.min(cx, db[2] - d / 2)), dy = (db[1] + db[3]) / 2, dir = cy < dy ? -1 : 1;
          mk('<line x1="' + (dx - d / 2) + '" y1="' + dy + '" x2="' + (dx + d / 2) + '" y2="' + dy + '" stroke="#fff" stroke-width="14"/><line x1="' + (dx - d / 2) + '" y1="' + dy + '" x2="' + (dx - d / 2) + '" y2="' + (dy + dir * d) + '" stroke="#13233a" stroke-width="3"/><path d="M' + (dx - d / 2) + ' ' + (dy + dir * d) + ' A' + d + ' ' + d + ' 0 0 ' + (dir < 0 ? 1 : 0) + ' ' + (dx + d / 2) + ' ' + dy + '" fill="none" stroke="#13233a" stroke-width="2"/>');
        } else { var ex = (db[0] + db[2]) / 2, ey = Math.max(db[1] + d / 2, Math.min(cy, db[3] - d / 2)), dr = cx < ex ? -1 : 1;
          mk('<line x1="' + ex + '" y1="' + (ey - d / 2) + '" x2="' + ex + '" y2="' + (ey + d / 2) + '" stroke="#fff" stroke-width="14"/><line x1="' + ex + '" y1="' + (ey - d / 2) + '" x2="' + (ex + dr * d) + '" y2="' + (ey - d / 2) + '" stroke="#13233a" stroke-width="3"/><path d="M' + (ex + dr * d) + ' ' + (ey - d / 2) + ' A' + d + ' ' + d + ' 0 0 ' + (dr > 0 ? 1 : 0) + ' ' + ex + ' ' + (ey + d / 2) + '" fill="none" stroke="#13233a" stroke-width="2"/>'); }
        info = 'Door cut into the wall.';
      } else {
        mk('<line x1="' + (cx - d / 2) + '" y1="' + s.y1 + '" x2="' + (cx + d / 2) + '" y2="' + s.y1 + '" stroke="#fff" stroke-width="12"/><line x1="' + (cx - d / 2) + '" y1="' + s.y1 + '" x2="' + (cx - d / 2) + '" y2="' + (s.y1 - d) + '" stroke="#13233a" stroke-width="3"/><path d="M' + (cx - d / 2) + ' ' + (s.y1 - d) + ' A' + d + ' ' + d + ' 0 0 1 ' + (cx + d / 2) + ' ' + s.y1 + '" fill="none" stroke="#13233a" stroke-width="2"/>');
      }
    } else if (/island|kitchen/.test(t)) {
      var iw = Math.min(150, Math.max(70, w * 0.5)), ih = Math.min(48, Math.max(30, h * 0.2));
      mk('<rect x="' + (cx - iw / 2) + '" y="' + (cy - ih / 2) + '" width="' + iw + '" height="' + ih + '" rx="5" fill="#fff" stroke="#13233a" stroke-width="3"/>');
    } else if (/walk|closet|storage|pantry/.test(t)) {
      var cw = Math.min(100, w * 0.5), ch = Math.min(70, h * 0.5);
      mk('<rect x="' + (s.x1 - cw) + '" y="' + (s.y1 - ch) + '" width="' + cw + '" height="' + ch + '" fill="rgba(46,106,142,.12)" stroke="#13233a" stroke-width="3"/><line x1="' + (s.x1 - cw) + '" y1="' + (s.y1 - ch) + '" x2="' + s.x1 + '" y2="' + s.y1 + '" stroke="#9aa6b0" stroke-width="2"/>');
    } else if (/open|remove|wall|merge|knock/.test(t)) {
      var iw = innerWalls(s);
      if (iw.length) {                                             // take out the detected inner wall segments inside the selection
        iw.forEach(function (d) {
          var bb = d.b;
          mk('<rect x="' + (bb[0] - 3) + '" y="' + (bb[1] - 3) + '" width="' + (bb[2] - bb[0] + 6) + '" height="' + (bb[3] - bb[1] + 6) + '" fill="#fff"/><rect x="' + bb[0] + '" y="' + bb[1] + '" width="' + (bb[2] - bb[0]) + '" height="' + (bb[3] - bb[1]) + '" fill="none" stroke="#6d4cff" stroke-width="3" stroke-dasharray="10 8"/>');
        });
        info = iw.length + (iw.length > 1 ? ' wall segments' : ' wall segment') + ' opened up.';
      } else if (s.rooms.length > 1) {
        var edges = [];
        for (var i = 0; i < s.rooms.length; i++) for (var j = i + 1; j < s.rooms.length; j++) edges = edges.concat(sharedEdges(s.rooms[i], s.rooms[j]));
        if (edges.length) { edges.forEach(function (e) { mk('<line x1="' + e[0] + '" y1="' + e[1] + '" x2="' + e[2] + '" y2="' + e[3] + '" stroke="#fff" stroke-width="14"/><line x1="' + e[0] + '" y1="' + e[1] + '" x2="' + e[2] + '" y2="' + e[3] + '" stroke="#6d4cff" stroke-width="3" stroke-dasharray="10 8"/>'); }); info = 'Wall between ' + s.rooms.map(function (r) { return r.n; }).join(' and ') + ' opened. '; }
        else mk('<rect x="' + s.x0 + '" y="' + s.y0 + '" width="' + w + '" height="' + h + '" rx="8" fill="none" stroke="#6d4cff" stroke-width="3" stroke-dasharray="10 8"/>');
      } else { mk('<rect x="' + s.x0 + '" y="' + s.y0 + '" width="' + w + '" height="' + h + '" rx="8" fill="none" stroke="#6d4cff" stroke-width="3" stroke-dasharray="10 8"/>'); info = 'No inside wall found in this area.'; }
    } else {
      mk('<rect x="' + (s.x0 - 6) + '" y="' + (s.y0 - 6) + '" width="' + (w + 12) + '" height="' + (h + 12) + '" rx="10" fill="rgba(109,76,255,.06)" stroke="#6d4cff" stroke-width="3" stroke-dasharray="10 8"/>');
    }
    c.done = true; c.mk.classList.add('ok'); if (c.li) { c.li.classList.add('ok'); if (info) c.li.querySelector('em').textContent = info.trim(); }
  }
  apply.onclick = function () {
    if (sent) {
      var m = document.getElementById('m');
      if (m) m.value = (m.value ? m.value + '\n' : '') + 'Plan changes to ' + fig.name + ': ' + changes.map(function (c) { return c.n + ') ' + c.sel.label + ': ' + c.t; }).join('; ');
      location.hash = '#contact';
      return;
    }
    apply.disabled = true;
    changes.filter(function (c) { return !c.done; }).forEach(function (c, k) { setTimeout(function () { draw(c); }, k * 700); });
    setTimeout(function () { sent = true; apply.disabled = false; apply.textContent = 'Send revisions to UBC'; note.textContent = 'Redrawn. Happy with it? Send it to our team and we will price the revised plan.'; clearSel(); }, changes.length * 700 + 300);
  };

  load(STD);
  window.UBCModify = { load: load };
})();
