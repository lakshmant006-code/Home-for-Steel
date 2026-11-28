/* Plan reader: finds the rooms in an uploaded floor-plan image, entirely in the browser (no server, no upload).
   1. keep only the thick dark strokes (the walls), dropping thin furniture lines and text
   2. close the gaps left by doors and windows so every room becomes a sealed area
   3. throw away everything outside the building, then label each remaining enclosed area as a room
   window.UBCReadPlan(img) -> { rooms: [{ n, b: [x0,y0,x1,y1] in image pixels, share }], footprint } */
(function () {
  'use strict';

  function dilate(m, w, h, r) {                                   // any set pixel within r (square window), separable via prefix sums
    if (r <= 0) return m.slice();
    var tmp = new Uint8Array(w * h), out = new Uint8Array(w * h), ps = new Int32Array(Math.max(w, h) + 1), x, y, i;
    for (y = 0; y < h; y++) {
      ps[0] = 0; for (x = 0; x < w; x++) ps[x + 1] = ps[x] + m[y * w + x];
      for (x = 0; x < w; x++) { var a = Math.max(0, x - r), b = Math.min(w, x + r + 1); tmp[y * w + x] = ps[b] - ps[a] > 0 ? 1 : 0; }
    }
    for (x = 0; x < w; x++) {
      ps[0] = 0; for (y = 0; y < h; y++) ps[y + 1] = ps[y] + tmp[y * w + x];
      for (y = 0; y < h; y++) { var c = Math.max(0, y - r), d = Math.min(h, y + r + 1); out[y * w + x] = ps[d] - ps[c] > 0 ? 1 : 0; }
    }
    return out;
  }
  function invert(m) { var o = new Uint8Array(m.length); for (var i = 0; i < m.length; i++) o[i] = m[i] ? 0 : 1; return o; }
  function erode(m, w, h, r) { return invert(dilate(invert(m), w, h, r)); }
  function close(m, w, h, r) { return erode(dilate(m, w, h, r), w, h, r); }
  function open(m, w, h, r) { return dilate(erode(m, w, h, r), w, h, r); }
  function count(m) { var n = 0; for (var i = 0; i < m.length; i++) n += m[i]; return n; }

  function floodOutside(wall, w, h) {                             // everything reachable from the border without crossing a wall
    var out = new Uint8Array(w * h), stack = [], i, x, y;
    function push(p) { if (!wall[p] && !out[p]) { out[p] = 1; stack.push(p); } }
    for (x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (stack.length) {
      i = stack.pop(); x = i % w; y = (i / w) | 0;
      if (x > 0) push(i - 1); if (x < w - 1) push(i + 1); if (y > 0) push(i - w); if (y < h - 1) push(i + w);
    }
    return out;
  }

  function components(free, w, h) {                               // 4-connected areas of free pixels
    var lab = new Int32Array(w * h), list = [], id = 0, stack = [], i0, i, x, y;
    for (i0 = 0; i0 < w * h; i0++) {
      if (!free[i0] || lab[i0]) continue;
      id++; var c = { id: id, area: 0, x0: w, y0: h, x1: 0, y1: 0 }; lab[i0] = id; stack.push(i0);
      while (stack.length) {
        i = stack.pop(); x = i % w; y = (i / w) | 0; c.area++;
        if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
        if (x > 0 && free[i - 1] && !lab[i - 1]) { lab[i - 1] = id; stack.push(i - 1); }
        if (x < w - 1 && free[i + 1] && !lab[i + 1]) { lab[i + 1] = id; stack.push(i + 1); }
        if (y > 0 && free[i - w] && !lab[i - w]) { lab[i - w] = id; stack.push(i - w); }
        if (y < h - 1 && free[i + w] && !lab[i + w]) { lab[i + w] = id; stack.push(i + w); }
      }
      list.push(c);
    }
    return list;
  }

  function read(img, dets, dbg) {
    var W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    if (!W || !H) return { rooms: [], footprint: 0 };
    var s = Math.min(1, 960 / Math.max(W, H)), w = Math.max(8, Math.round(W * s)), h = Math.max(8, Math.round(H * s));
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var cx = cv.getContext('2d', { willReadFrequently: true });
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(img, 0, 0, w, h);      // flatten any transparency onto white
    var px = cx.getImageData(0, 0, w, h).data, dark = new Uint8Array(w * h), i;
    for (i = 0; i < w * h; i++) { var lum = px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114; dark[i] = lum < 110 ? 1 : 0; }

    var big = Math.max(w, h);
    var thick = open(dark, w, h, 1);                                 // walls survive, 1 to 2 px furniture lines and text do not
    if (count(thick) < w * h * 0.004) thick = dark;                  // hand sketches with thin lines: keep everything
    var usedModel = 0;
    if (dets && dets.length) {                                       // the detection model's walls, doors, windows and columns become part of the wall mask
      var SEAL = { 'Wall': 1, 'Door': 1, 'Sliding Door': 1, 'Window': 1, 'Curtain Wall': 1, 'Column': 1 }, grow = Math.max(1, Math.round(big * 0.003));
      thick = thick.slice();
      dets.forEach(function (d) {
        if (!SEAL[d.cls]) return;
        var x0 = Math.max(0, Math.floor(d.box[0] * s) - grow), y0 = Math.max(0, Math.floor(d.box[1] * s) - grow), x1 = Math.min(w - 1, Math.ceil(d.box[2] * s) + grow), y1 = Math.min(h - 1, Math.ceil(d.box[3] * s) + grow), yy, xx;
        for (yy = y0; yy <= y1; yy++) for (xx = x0; xx <= x1; xx++) thick[yy * w + xx] = 1;
        usedModel++;
      });
    }
    var bx0 = w, by0 = h, bx1 = 0, by1 = 0, tx, ty;                  // bounding box of the walls
    for (ty = 0; ty < h; ty++) for (tx = 0; tx < w; tx++) if (thick[ty * w + tx]) { if (tx < bx0) bx0 = tx; if (tx > bx1) bx1 = tx; if (ty < by0) by0 = ty; if (ty > by1) by1 = ty; }
    var bbox = Math.max(1, (bx1 - bx0 + 1) * (by1 - by0 + 1));
    if (bx1 <= bx0 || by1 <= by0) return { rooms: [], footprint: 0 };

    // 1) the building outline: seal windows and doors in the outer wall with the weakest closing that makes a solid building
    var inside = null, foot = 0, sealPct = [3, 4.5, 6.5, 9], si;
    for (si = 0; si < sealPct.length; si++) {
      var heavy = close(thick, w, h, Math.round(big * sealPct[si] / 100)), outside = floodOutside(heavy, w, h), ins = new Uint8Array(w * h), f = 0;
      for (i = 0; i < w * h; i++) if (!outside[i]) { ins[i] = 1; f++; }
      inside = ins; foot = f;
      if (f >= bbox * 0.4) break;                                    // a real building fills a good share of its own bounding box
    }
    if (foot < w * h * 0.04) return { rooms: [], footprint: 0 };     // nothing that looks like a building

    // 2) the rooms: seal door gaps with the weakest closing that still gives a plausible set of rooms
    var best = null, lightPct = [1.2, 1.8, 2.5, 3.5], li;
    for (li = 0; li < lightPct.length; li++) {
      var light = close(thick, w, h, Math.round(big * lightPct[li] / 100)), free = new Uint8Array(w * h);
      for (i = 0; i < w * h; i++) free[i] = inside[i] && !light[i] ? 1 : 0;
      var cs = components(free, w, h), minArea = foot * 0.004, ok = [], covered = 0;
      cs.forEach(function (c) {
        var bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1;
        if (c.area < minArea || bw < big * 0.025 || bh < big * 0.025) return;
        if (c.area > foot * 0.7) return;                             // everything merged into one area: not a room
        if (c.x0 <= 1 || c.y0 <= 1 || c.x1 >= w - 2 || c.y1 >= h - 2) return;   // touching the edge of the picture: blank margin, not a room
        if (c.area < (bw * bh) * 0.35) return;                       // ragged leftover strips, not a room
        ok.push(c); covered += c.area;
      });
      if (dbg) dbg.push({ light: lightPct[li], comps: cs.length, big: cs.filter(function (c) { return c.area >= minArea; }).length, kept: ok.length, covered: Math.round(covered / foot * 100), merged: cs.filter(function (c) { return c.area > foot * 0.7; }).length, ragged: cs.filter(function (c) { var bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1; return c.area >= minArea && c.area < bw * bh * 0.35; }).length });
      var score = ok.length * Math.min(1, covered / (foot * 0.5));   // many rooms that together fill a good part of the building
      if (!best || score > best.score + 0.01) best = { score: score, keep: ok };
    }
    var keep = best.keep;
    keep.sort(function (a, b) { var ra = Math.round(((a.y0 + a.y1) / 2) / (h / 7)), rb = Math.round(((b.y0 + b.y1) / 2) / (h / 7)); return ra - rb || a.x0 - b.x0; });
    // rooms come from separate flood-filled areas, so none can duplicate another (a U-shaped room's box may cover its neighbours, which is fine)
    var pad = Math.max(2, Math.round(big * 0.004));                  // grow each box back over half the wall that was cut away
    var rooms = keep.map(function (c, k) {
      return { n: 'Room ' + (k + 1),
        b: [Math.max(0, Math.round((c.x0 - pad) / s)), Math.max(0, Math.round((c.y0 - pad) / s)), Math.min(W, Math.round((c.x1 + pad) / s)), Math.min(H, Math.round((c.y1 + pad) / s))],
        share: c.area / foot };
    });
    if (dbg) dbg.push({ foot: Math.round(foot / (w * h) * 100), bboxFill: Math.round(foot / bbox * 100), seal: sealPct[Math.min(si, sealPct.length - 1)] });
    return { rooms: rooms, footprint: foot / (w * h) };
  }

  window.UBCReadPlan = function (img, dets, dbg) { return read(img, dets, dbg); };
})();
