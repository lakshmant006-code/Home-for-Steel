/* Contact section: a 3D house made of white dots that glitter, behind the form; and the form itself (opens the visitor's email app). */
(function () {
  'use strict';
  var cv = document.getElementById('cgCv'), sec = document.getElementById('contact'), form = document.getElementById('cgForm');
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- the form ---------------- */
  if (form) {
    var err = document.getElementById('cgErr'), note = document.getElementById('cgNote');
    var $ = function (id) { return document.getElementById(id); };
    $('m').maxLength = 1500;
    form.addEventListener('input', function (e) { e.target.classList.remove('bad'); err.hidden = true; });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('cgName'), email = $('cgEmail'), msg = $('m'), bad = [];
      if (!name.value.trim()) bad.push(name);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) bad.push(email);
      if (!msg.value.trim()) bad.push(msg);
      [name, email, msg].forEach(function (f) { f.classList.toggle('bad', bad.indexOf(f) > -1); });
      if (bad.length) {
        err.textContent = bad[0] === email ? 'Please enter a valid email address.' : 'Please fill in your name, email and message.';
        err.hidden = false; bad[0].focus(); return;
      }
      var lines = ['Name: ' + name.value.trim(), 'Phone: ' + ($('cgPhone').value.trim() || '-'), 'Email: ' + email.value.trim(),
        "I'm a: " + $('cgRole').value, 'Project type: ' + $('cgType').value, 'Location: ' + ($('cgLoc').value.trim() || '-'), '', msg.value.trim()];
      var href = 'mailto:marketing@homeplansforsteel.com?subject=' + encodeURIComponent('Website enquiry from ' + name.value.trim() + ' (' + $('cgRole').value + ')') + '&body=' + encodeURIComponent(lines.join('\n'));
      err.hidden = true;
      note.textContent = 'Your email app should open with this message ready. If it did not, write to marketing@homeplansforsteel.com.';
      window.location.href = href;
    });
  }

  /* ---------------- the glittering house ---------------- */
  if (!cv || !sec) return;
  var ctx = cv.getContext('2d'), M = null, W = 0, H = 0, DP = 1, vis = false, raf = 0, t0 = 0;
  var N = 0, mx, my, mz, ph, sp, ext = 1, zb = null, GW = 0, DUST = [];
  var D = 420, PITCH = .36, GS = 2;

  function build(j) {
    var total = (j.length / 4) | 0, limit = innerWidth < 700 ? 24000 : 52000, step = Math.max(1, Math.ceil(total / limit)), idx = [];
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (var i = 0; i < total; i += step) {
      if (j[i * 4 + 3] >= 256) continue;                                  // solid points only: no ghost detail
      idx.push(i);
      var X = j[i * 4] / 10, Y = j[i * 4 + 1] / 10, Z = j[i * 4 + 2] / 10;
      if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; if (Z < z0) z0 = Z; if (Z > z1) z1 = Z;
    }
    N = idx.length; mx = new Float32Array(N); my = new Float32Array(N); mz = new Float32Array(N); ph = new Float32Array(N); sp = new Float32Array(N);
    var gx = (x0 + x1) / 2, gy = (y0 + y1) / 2, gz = (z0 + z1) / 2;
    for (var k = 0; k < N; k++) {
      var q = idx[k]; mx[k] = j[q * 4] / 10 - gx; my[k] = j[q * 4 + 1] / 10 - gy; mz[k] = j[q * 4 + 2] / 10 - gz;
      ph[k] = Math.random() * 6.283; sp[k] = .5 + Math.random() * 2.2;
    }
    ext = Math.max(x1 - x0, z1 - z0, 1);
  }
  function layout() {
    DP = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; if (!W || !H) return;
    cv.width = W * DP; cv.height = H * DP;
    DUST = []; var nd = W < 700 ? 60 : 130;
    for (var i = 0; i < nd; i++) DUST.push({ x: Math.random() * W, y: Math.random() * H, r: .8 + Math.random() * 1.8, ph: Math.random() * 6.283, sp: .6 + Math.random() * 1.6, vy: -(2 + Math.random() * 6) });
  }
  function star(x, y, r, a) {                                              // a four-point sparkle with a soft core
    ctx.globalAlpha = a; ctx.fillStyle = '#fff';
    ctx.fillRect(x - r, y - .5, r * 2, 1); ctx.fillRect(x - .5, y - r, 1, r * 2);
    ctx.beginPath(); ctx.arc(x, y, Math.max(.8, r * .22), 0, 6.283); ctx.fill();
  }
  function frame(now) {
    if (!vis) { raf = 0; return; }
    raf = requestAnimationFrame(frame);
    var t = (now - t0) / 1000;
    ctx.setTransform(DP, 0, 0, DP, 0, 0); ctx.clearRect(0, 0, W, H);
    var phone = W < 900, target = phone ? W * .78 : Math.min(W * .44, H * 1.0), f = target * D / ext;
    var cx = phone ? W * .5 : W * .73, cy = phone ? Math.min(H * .25, 190) : H * .5;
    var ang = RM ? .75 : t * .12 + .6, ca = Math.cos(ang), sa = Math.sin(ang), cp = Math.cos(PITCH), spt = Math.sin(PITCH);
    var cw = Math.ceil(W / GS) + 2, ch = Math.ceil(H / GS) + 2;
    if (!zb || zb.length !== cw * ch) zb = new Float32Array(cw * ch); GW = cw; zb.fill(1e9);
    var xs = new Float32Array(N), ys = new Float32Array(N), zs = new Float32Array(N);
    for (var i = 0; i < N; i++) {                                           // project, and record the nearest depth in each small cell
      var x = mx[i] * ca - mz[i] * sa, z = mx[i] * sa + mz[i] * ca, y2 = my[i] * cp - z * spt, z2 = -(z * cp + my[i] * spt), k = f / (D + z2);
      var sx = cx + x * k, sy = cy - y2 * k; xs[i] = sx; ys[i] = sy; zs[i] = z2;
      var g = ((sy / GS) | 0) * GW + ((sx / GS) | 0); if (g >= 0 && g < zb.length && z2 < zb[g]) zb[g] = z2;
    }
    ctx.fillStyle = '#fff'; ctx.globalAlpha = .62;                          // the steady body of the house
    for (var a = 0; a < N; a++) {
      var g2 = ((ys[a] / GS) | 0) * GW + ((xs[a] / GS) | 0);
      if (g2 < 0 || g2 >= zb.length || zs[a] > zb[g2] + 2.4) continue;
      ctx.fillRect(xs[a], ys[a], .85, .85);
    }
    for (var b = 0; b < N; b += 5) {                                        // glitter: every fifth point flashes on its own rhythm
      var g3 = ((ys[b] / GS) | 0) * GW + ((xs[b] / GS) | 0);
      if (g3 < 0 || g3 >= zb.length || zs[b] > zb[g3] + 2.4) continue;
      var tw = RM ? 0 : Math.sin(t * sp[b] + ph[b]); if (tw < .82) continue;
      var s = (tw - .82) / .18;                                               // 0..1 flash strength
      ctx.globalAlpha = .25 + .75 * s; ctx.fillStyle = '#fff'; ctx.fillRect(xs[b] - 1, ys[b] - 1, 2.4, 2.4);
      if (s > .93) star(xs[b], ys[b], 3 + s * 3, s * .9);                        // the brightest flashes grow a little cross
    }
    for (var d = 0; d < DUST.length; d++) {                                 // drifting sparkles around the house
      var p = DUST[d], yy = RM ? p.y : ((p.y + p.vy * t) % H + H) % H, tw2 = RM ? .5 : (Math.sin(t * p.sp + p.ph) + 1) / 2;
      star(p.x, yy, p.r * 2.2, .12 + .75 * tw2 * tw2);
    }
    ctx.globalAlpha = 1;
  }
  function start() { if (!vis || raf || !M) return; if (!t0) t0 = performance.now(); raf = requestAnimationFrame(frame); }

  fetch('assets/plan/house3d.json').then(function (r) { return r.json(); }).then(function (j) { M = j; build(j); layout(); start(); if (RM) { vis = true; frame(performance.now()); vis = false; } }).catch(function () {});
  new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) start(); }, { threshold: 0 }).observe(sec);
  addEventListener('resize', function () { if (M) { layout(); if (RM) { vis = true; frame(performance.now()); vis = false; } } });
})();
