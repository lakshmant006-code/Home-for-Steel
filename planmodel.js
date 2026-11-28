/* Runs the open-source YOLOv8 floor-plan model (sanatladkat/floor-plan-object-detection, MIT) inside the browser with ONNX Runtime Web.
   Nothing is uploaded: the visitor's plan stays on their computer. The model file is only downloaded the first time someone uploads a plan.
   window.UBCPlanModel.detect(imgElement, onProgress) -> Promise<[{ cls, conf, box:[x0,y0,x1,y1] in image pixels }]> */
(function () {
  'use strict';
  var MODEL = 'assets/models/floorplan-1024.onnx', SIZE = 1024, CONF = 0.25, IOU = 0.7;
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
  function session(onProgress) {                                           // load the runtime and the model once, then reuse them
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
  function decode(out, dims, scale, padX, padY, W, H) {
    var C = dims[1], N = dims[2], nc = C - 4, cand = [], i, k;
    for (i = 0; i < N; i++) {
      var best = 0, bk = -1;
      for (k = 0; k < nc; k++) { var sc = out[(4 + k) * N + i]; if (sc > best) { best = sc; bk = k; } }
      if (best < CONF) continue;
      var cx = out[i], cy = out[N + i], w = out[2 * N + i], h = out[3 * N + i];
      cand.push({ k: bk, conf: best, box: [Math.max(0, (cx - w / 2 - padX) / scale), Math.max(0, (cy - h / 2 - padY) / scale), Math.min(W, (cx + w / 2 - padX) / scale), Math.min(H, (cy + h / 2 - padY) / scale)] });
    }
    cand.sort(function (a, b) { return b.conf - a.conf; });
    var keep = [];
    cand.forEach(function (c) { if (!keep.some(function (q) { return q.k === c.k && iou(q.box, c.box) > IOU; })) keep.push(c); });   // non-maximum suppression, per class
    return keep.map(function (c) { return { cls: NAMES[c.k] || ('class' + c.k), conf: Math.round(c.conf * 1000) / 1000, box: c.box.map(Math.round) }; });
  }

  function detect(img, onProgress) {
    var W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    return session(function (f) { if (onProgress) onProgress('download', f); }).then(function (sess) {
      if (onProgress) onProgress('run', 0);
      var scale = SIZE / Math.max(W, H), nw = Math.round(W * scale), nh = Math.round(H * scale), padX = Math.floor((SIZE - nw) / 2), padY = Math.floor((SIZE - nh) / 2);
      var cv = document.createElement('canvas'); cv.width = SIZE; cv.height = SIZE;
      var cx = cv.getContext('2d', { willReadFrequently: true });
      cx.fillStyle = 'rgb(114,114,114)'; cx.fillRect(0, 0, SIZE, SIZE);     // same grey letterbox the model was trained with
      cx.imageSmoothingQuality = 'high'; cx.drawImage(img, padX, padY, nw, nh);
      var px = cx.getImageData(0, 0, SIZE, SIZE).data, plane = SIZE * SIZE, data = new Float32Array(3 * plane), i;
      for (i = 0; i < plane; i++) { data[i] = px[i * 4] / 255; data[plane + i] = px[i * 4 + 1] / 255; data[2 * plane + i] = px[i * 4 + 2] / 255; }
      var feeds = {}; feeds[sess.inputNames[0]] = new runtime.Tensor('float32', data, [1, 3, SIZE, SIZE]);
      return new Promise(function (r) { setTimeout(r, 30); }).then(function () { return sess.run(feeds); }).then(function (res) {
        var o = res[sess.outputNames[0]];
        return decode(o.data, o.dims, scale, padX, padY, W, H);
      });
    });
  }

  window.UBCPlanModel = { detect: detect, ready: function (p) { return session(p); } };
})();
