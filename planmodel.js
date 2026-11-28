/* Runs the open-source YOLOv8 floor-plan model (sanatladkat/floor-plan-object-detection, MIT) inside the browser with ONNX Runtime Web.
   Nothing is uploaded: the visitor's plan stays on their computer. The model file is only downloaded the first time someone uploads a plan.
   Large sheets are read in overlapping tiles, so small doors and windows are not lost when a big drawing is shrunk to the model's 1024 px input.
   window.UBCPlanModel.detect(imgElement, onProgress) -> Promise<[{ cls, conf, box:[x0,y0,x1,y1] in image pixels }]>
   onProgress(stage, fraction, part, parts): stage is 'download' or 'run'. */
(function () {
  'use strict';
  var MODEL = 'assets/models/floorplan-1024.onnx', SIZE = 1024, CONF = 0.25, IOU = 0.7;
  var SINGLE_MAX = 1800;                                                     // up to this long side the whole plan is read in one pass
  var TILE = 1536, OVERLAP = 192, MAX_TILES = 6;                             // bigger sheets: tiles of about 1536 px that overlap, at most 6 of them
  var LONG = { 'Wall': 1, 'Curtain Wall': 1, 'Railing': 1 };                 // long things are kept even when a tile edge cuts them (the other tile sees the rest)
  var NAMES = ['Column', 'Curtain Wall', 'Dimension', 'Door', 'Railing', 'Sliding Door', 'Stair Case', 'Wall', 'Window'];
  var runtime = null, sessionP = null;

  function loadScript(src) {
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('could not load ' + src)); }; document.head.appendChild(s); });
  }
  function fetchWithProgress(url, onProgress) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('model file missing (' + r.status + ')');
      var total = +r.headers.get('content-length') || 0;
      if (!r.body || !r.body.getReader || !total) return r.arrayBuffer();
      var rd = r.body.getReader(), got = 0, parts = [];
      return (function pump() {
        return rd.read().then(function (x) {
          if (x.done) { var out = new Uint8Array(got), o = 0; parts.forEach(function (p) { out.set(p, o); o += p.length; }); return out.buffer; }
          parts.push(x.value); got += x.value.length; if (onProgress) onProgress(Math.min(.99, got / total)); return pump();
        });
      })();
    });
  }
  function session(onProgress) {                                             // load the runtime and the model once, then reuse them
    if (sessionP) return sessionP;
    sessionP = loadScript('assets/ort/ort.wasm.min.js').then(function () {
      runtime = window.ort; runtime.env.wasm.numThreads = 1; runtime.env.wasm.simd = true; runtime.env.wasm.wasmPaths = new URL('assets/ort/', document.baseURI).href;   // the runtime imports its helper with a full address
      return fetchWithProgress(MODEL, onProgress);
    }).then(function (buf) {
      return runtime.InferenceSession.create(buf, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
    }).catch(function (e) { sessionP = null; throw e; });
    return sessionP;
  }

  function iou(a, b) {
    var x0 = Math.max(a[0], b[0]), y0 = Math.max(a[1], b[1]), x1 = Math.min(a[2], b[2]), y1 = Math.min(a[3], b[3]);
    var inter = Math.max(0, x1 - x0) * Math.max(0, y1 - y0), ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter;
    return ua > 0 ? inter / ua : 0;
  }
  function nms(list) {                                                       // non-maximum suppression, per class
    list.sort(function (a, b) { return b.conf - a.conf; });
    var keep = [];
    list.forEach(function (c) { if (!keep.some(function (q) { return q.cls === c.cls && iou(q.box, c.box) > IOU; })) keep.push(c); });
    return keep;
  }
  function decode(out, dims, scale, padX, padY, W, H) {
    var C = dims[1], N = dims[2], nc = C - 4, cand = [], i, k;
    for (i = 0; i < N; i++) {
      var best = 0, bk = -1;
      for (k = 0; k < nc; k++) { var sc = out[(4 + k) * N + i]; if (sc > best) { best = sc; bk = k; } }
      if (best < CONF) continue;
      var cx = out[i], cy = out[N + i], w = out[2 * N + i], h = out[3 * N + i];
      cand.push({ cls: NAMES[bk] || ('class' + bk), conf: best, box: [Math.max(0, (cx - w / 2 - padX) / scale), Math.max(0, (cy - h / 2 - padY) / scale), Math.min(W, (cx + w / 2 - padX) / scale), Math.min(H, (cy + h / 2 - padY) / scale)] });
    }
    return nms(cand);
  }

  /* ---------- tiles ---------- */
  function axis(L, T) {                                                      // start/end pairs along one side, overlapping by OVERLAP
    if (L <= T) return [[0, L]];
    var step = T - OVERLAP, n = Math.ceil((L - OVERLAP) / step), out = [], i;
    for (i = 0; i < n; i++) { var s = Math.min(i * step, L - T); if (!out.length || s > out[out.length - 1][0]) out.push([s, s + T]); }
    return out;
  }
  function tilesFor(W, H) {
    if (Math.max(W, H) <= SINGLE_MAX) return [{ x: 0, y: 0, w: W, h: H }];
    var T = TILE, xs, ys;
    for (;; T += 256) { xs = axis(W, T); ys = axis(H, T); if (xs.length * ys.length <= MAX_TILES || T >= 4096) break; }
    var tiles = [];
    ys.forEach(function (y) { xs.forEach(function (x) { tiles.push({ x: x[0], y: y[0], w: x[1] - x[0], h: y[1] - y[0] }); }); });
    return tiles;
  }

  /* ---------- one pass of the model over a rectangle of the plan ---------- */
  function runRect(sess, img, t, W, H) {
    var scale = SIZE / Math.max(t.w, t.h), nw = Math.round(t.w * scale), nh = Math.round(t.h * scale), padX = Math.floor((SIZE - nw) / 2), padY = Math.floor((SIZE - nh) / 2);
    var cv = document.createElement('canvas'); cv.width = SIZE; cv.height = SIZE;
    var cx = cv.getContext('2d', { willReadFrequently: true });
    cx.fillStyle = 'rgb(114,114,114)'; cx.fillRect(0, 0, SIZE, SIZE);        // same grey letterbox the model was trained with
    cx.imageSmoothingQuality = 'high'; cx.drawImage(img, t.x, t.y, t.w, t.h, padX, padY, nw, nh);
    var px = cx.getImageData(0, 0, SIZE, SIZE).data, plane = SIZE * SIZE, data = new Float32Array(3 * plane), i;
    for (i = 0; i < plane; i++) { data[i] = px[i * 4] / 255; data[plane + i] = px[i * 4 + 1] / 255; data[2 * plane + i] = px[i * 4 + 2] / 255; }
    var feeds = {}; feeds[sess.inputNames[0]] = new runtime.Tensor('float32', data, [1, 3, SIZE, SIZE]);
    return new Promise(function (r) { setTimeout(r, 30); }).then(function () { return sess.run(feeds); }).then(function (res) {
      var o = res[sess.outputNames[0]], found = decode(o.data, o.dims, scale, padX, padY, t.w, t.h), E = 4;
      return found.filter(function (d) {                                     // a small thing cut by an inner tile edge is seen whole in the neighbouring tile: drop the cut copy
        if (LONG[d.cls]) return true;
        var b = d.box;
        return !((t.x > 0 && b[0] <= E) || (t.y > 0 && b[1] <= E) || (t.x + t.w < W && b[2] >= t.w - E) || (t.y + t.h < H && b[3] >= t.h - E));
      }).map(function (d) { return { cls: d.cls, conf: d.conf, box: [d.box[0] + t.x, d.box[1] + t.y, d.box[2] + t.x, d.box[3] + t.y] }; });
    });
  }

  function detect(img, onProgress) {
    var W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    return session(function (f) { if (onProgress) onProgress('download', f, 0, 0); }).then(function (sess) {
      var tiles = tilesFor(W, H), all = [], i = 0;
      return (function next() {
        if (i >= tiles.length) {
          return nms(all).map(function (d) { return { cls: d.cls, conf: Math.round(d.conf * 1000) / 1000, box: d.box.map(Math.round) }; });
        }
        if (onProgress) onProgress('run', i / tiles.length, i + 1, tiles.length);
        return runRect(sess, img, tiles[i], W, H).then(function (found) { all = all.concat(found); i++; return next(); });
      })();
    });
  }

  window.UBCPlanModel = { detect: detect, ready: function (p) { return session(p); }, tilesFor: tilesFor };
})();
