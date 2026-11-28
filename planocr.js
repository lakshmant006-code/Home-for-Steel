/* Reads the printed room names and sizes on an uploaded plan, in the browser, with Tesseract.js (Apache-2.0).
   Nothing is uploaded: the text reader and its English data are served from assets/ocr and run on the visitor's computer.
   window.UBCPlanOCR.read(imgEl)                -> Promise<[{ t, c, b:[x0,y0,x1,y1] }]>   words found, in image pixels
   window.UBCPlanOCR.label(words, rooms, rin)   -> [{ name, dim:[w,d] feet, print }|null] one entry per room
   window.UBCPlanOCR.scale(rooms, labels)       -> { fx, fy } pixels per foot from the printed sizes, or null */
(function () {
  'use strict';
  var BASE = null, workerP = null;
  var SKIP = /^(FLOOR|AREA|SCALE|SHEET|NOTES?|TOTAL|PLAN|DRAWN|DATE|SQ|FT|OHD|TYP|HVAC|ELEV|ELEVATION)$/;   // words that are drawing text, not room names
  var PORCHES = /PORCH|PATIO|DECK|BALCONY/;

  function loadScript(src) {
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('could not load ' + src)); }; document.head.appendChild(s); });
  }
  function worker() {
    if (workerP) return workerP;
    BASE = new URL('assets/ocr/', document.baseURI).href;
    workerP = (window.Tesseract ? Promise.resolve() : loadScript(BASE + 'tesseract.min.js')).then(function () {
      return window.Tesseract.createWorker('eng', 1, { workerPath: BASE + 'worker.min.js', corePath: BASE, langPath: BASE, gzip: true });
    }).then(function (w) {
      return w.setParameters({ tessedit_pageseg_mode: '11', preserve_interword_spaces: '1' }).then(function () { return w; });
    }).catch(function (e) { workerP = null; throw e; });
    return workerP;
  }

  function read(img) {
    var W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    var sc = Math.max(1, Math.min(2, 2800 / Math.max(W, H)));              // small text needs about 2x; very large sheets are read as they are
    return worker().then(function (w) {
      var cv = document.createElement('canvas'); cv.width = Math.round(W * sc); cv.height = Math.round(H * sc);
      var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.imageSmoothingQuality = 'high'; cx.drawImage(img, 0, 0, cv.width, cv.height);
      return w.recognize(cv).then(function (r) {
        return (r.data.words || []).map(function (x) { return { t: x.text, c: x.confidence, b: [x.bbox.x0 / sc, x.bbox.y0 / sc, x.bbox.x1 / sc, x.bbox.y1 / sc] }; });
      });
    });
  }

  /* ---------- words -> lines ---------- */
  function lines(words) {
    var ws = words.filter(function (w) { return w.c >= 40 && /\S/.test(w.t); }).sort(function (a, b) { return a.b[1] - b.b[1] || a.b[0] - b.b[0]; }), out = [];
    ws.forEach(function (w) {
      var h = w.b[3] - w.b[1], cy = (w.b[1] + w.b[3]) / 2, hit = null;
      out.forEach(function (l) { if (!hit && Math.abs(l.cy - cy) < h * .5 && w.b[0] - l.b[2] < h * 1.3 && w.b[0] >= l.b[0]) hit = l; });
      if (hit) { hit.t += ' ' + w.t; hit.b = [hit.b[0], Math.min(hit.b[1], w.b[1]), Math.max(hit.b[2], w.b[2]), Math.max(hit.b[3], w.b[3])]; hit.c = Math.min(hit.c, w.c); hit.cy = (hit.b[1] + hit.b[3]) / 2; }
      else out.push({ t: w.t, b: w.b.slice(), c: w.c, cy: cy });
    });
    return out;
  }
  function parseDim(t) {                                                    // 11'-4"X11'-0"  ->  [11.33, 11]
    var s = t.replace(/[“”″]/g, '"').replace(/[‘’′`´]/g, "'").replace(/\s+/g, '');
    var m = /(\d{1,2})'-?(\d{1,2})?(?:\d\/\d)?["°”]?[xX×](\d{1,2})'-?(\d{1,2})?/.exec(s);
    if (!m) return null;
    var a = +m[1] + (+m[2] || 0) / 12, b = +m[3] + (+m[4] || 0) / 12;
    if (a < 3 || b < 3 || a > 80 || b > 80) return null;
    var ia = m[2] ? +m[2] : 0, ib = m[4] ? +m[4] : 0;
    return { d: [a, b], print: m[1] + "'" + (m[2] ? '-' + ia + '"' : '') + ' × ' + m[3] + "'" + (m[4] ? '-' + ib + '"' : '') };
  }
  function nameOf(t) {
    var s = t.toUpperCase().replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (s.length < 3 || SKIP.test(s)) return '';
    var words = s.split(' ').filter(function (w) { return w.length > 1; });
    if (!words.length || words.some(function (w) { return SKIP.test(w); })) return '';
    if (words.join('').length < 3 || words.length > 3) return '';
    return words.map(function (w) { return w.charAt(0) + w.slice(1).toLowerCase(); }).join(' ');
  }

  /* ---------- match text to the rooms found on the plan ---------- */
  function label(words, rooms, rin) {
    var ls = lines(words).map(function (l) {
      return { b: l.b, x: (l.b[0] + l.b[2]) / 2, y: (l.b[1] + l.b[3]) / 2, dim: parseDim(l.t), name: parseDim(l.t) ? '' : nameOf(l.t), c: l.c };
    });
    var res = rooms.map(function (r) {
      var inside = ls.filter(function (l) { return rin(r, l.x, l.y); });
      var nm = inside.filter(function (l) { return l.name && l.c >= 60; }).sort(function (a, b) { return a.y - b.y; })[0];
      if (!nm) { var dm0 = inside.filter(function (l) { return l.dim; })[0]; return dm0 ? { name: '', dim: dm0.dim.d, print: dm0.dim.print } : null; }
      var dms = inside.filter(function (l) { return l.dim; }).sort(function (a, b) { return Math.abs(a.y - nm.y) - Math.abs(b.y - nm.y); });
      return { name: nm.name, dim: dms[0] ? dms[0].dim.d : null, print: dms[0] ? dms[0].dim.print : '' };
    });
    var count = {}, seen = {};                                              // Bedroom, Bedroom, Bedroom -> Bedroom 1, 2, 3
    res.forEach(function (x) { if (x && x.name) count[x.name] = (count[x.name] || 0) + 1; });
    res.forEach(function (x) { if (x && x.name && count[x.name] > 1) { seen[x.name] = (seen[x.name] || 0) + 1; x.name += ' ' + seen[x.name]; } });
    return res;
  }

  function median(a) { a = a.slice().sort(function (p, q) { return p - q; }); return a[a.length >> 1]; }
  function scale(rooms, labels, rin) {                                      // the printed width and depth of rooms, against their size in pixels, give the true scale on each axis
    var xs = [], ys = [];
    rooms.forEach(function (r, i) {
      var l = labels[i]; if (!l || !l.dim || PORCHES.test(l.name.toUpperCase())) return;
      var bw = r.b[2] - r.b[0], bh = r.b[3] - r.b[1];
      var o1 = Math.abs(Math.log((bw / l.dim[0]) / (bh / l.dim[1]))), o2 = Math.abs(Math.log((bw / l.dim[1]) / (bh / l.dim[0])));
      if (o2 < o1) l.dim = [l.dim[1], l.dim[0]], l.print = l.print.split(' × ').reverse().join(' × ');   // printed the other way round
      xs.push(bw / l.dim[0]); ys.push(bh / l.dim[1]);
    });
    if (xs.length < 2) return null;
    var fx = median(xs), fy = median(ys);
    var ok = xs.filter(function (v) { return Math.abs(v / fx - 1) < .25; }).length;   // most rooms must agree, or the numbers were misread
    return ok >= Math.max(2, Math.ceil(xs.length * .6)) ? { fx: fx, fy: fy, n: xs.length } : null;
  }

  window.UBCPlanOCR = { read: read, label: label, scale: scale, parseDim: parseDim };
})();
