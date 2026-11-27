/* Home Plans for Steel: scroll + entrance animations (GSAP, ScrollTrigger, anime.js) */
(function () {
  'use strict';
  if (!window.gsap || !window.ScrollTrigger) return;           // CDN failed: keep the CSS fallback
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add('gx');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var EASE = 'expo.out';

  /* ---- helpers ---- */
  function splitWords(el) {
    if (!el || el.dataset.split || el.children.length) return $$('.gx-w', el);
    el.dataset.split = '1';
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map(function (w) {
      return '<span class="gx-m" aria-hidden="true"><span class="gx-w">' + w + '</span></span>';
    }).join(' ');
    return $$('.gx-w', el);
  }
  function settle(el) { el.classList.add('in'); gsap.set(el, { clearProps: 'opacity,transform,visibility' }); }
  function headingIn(h, trigger, delay) {
    if (!h) return;
    h.classList.add('in');
    var w = splitWords(h);
    gsap.set(h, { opacity: 1, y: 0 });
    gsap.from(w, {
      yPercent: 115, rotate: 4, duration: 1.1, ease: EASE, stagger: 0.07, delay: delay || 0,
      scrollTrigger: trigger ? { trigger: trigger, start: 'top 82%', once: true } : null
    });
  }

  /* ---- scroll progress bar ---- */
  var bar = document.createElement('div');
  bar.className = 'gx-progress';
  document.body.appendChild(bar);
  gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

  /* ---- navigation ---- */
  var nav = $('nav');
  if (nav) {
    gsap.from(nav, { yPercent: -100, opacity: 0, duration: 1, ease: EASE, delay: 0.1 });
    gsap.from($$('.nl a, .nr a', nav), { y: -14, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.06, delay: 0.45 });
  }

  /* ---- hero ---- */
  var h1 = $('.hero h1');
  if (h1) {
    var tl = gsap.timeline({ defaults: { ease: EASE }, delay: 0.25 });
    tl.from(splitWords(h1), { yPercent: 115, rotate: 5, duration: 1.3, stagger: 0.045 });
    var back = { y: 0 };
    gsap.to('.hero .htop', {
      yPercent: -14, opacity: 0.2, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  /* ---- generic reveals on the home page (everything .reveal not handled below) ---- */
  var headings = $$('#home h2.reveal');
  var plain = $$('#home .reveal').filter(function (el) {
    return headings.indexOf(el) < 0 && !el.classList.contains('ft') && !el.classList.contains('cl-card');
  });
  ScrollTrigger.batch(plain, {
    start: 'top 88%', once: true,
    onEnter: function (b) {
      gsap.fromTo(b, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: EASE, stagger: 0.12, onComplete: function () { b.forEach(settle); } });
    }
  });
  gsap.set(plain, { opacity: 0, y: 50 });

  /* ---- section heads (tag, heading, paragraph, corner marks) ---- */
  $$('#home .sh-head').forEach(function (head) {
    var h = $('h2', head);
    gsap.from($('.tag', head), { y: 20, opacity: 0, scale: 0.9, duration: 0.9, ease: 'back.out(1.7)', scrollTrigger: { trigger: head, start: 'top 82%', once: true } });
    headingIn(h, head, 0.1);
    gsap.from($('p', head), { y: 24, opacity: 0, duration: 1, ease: EASE, delay: 0.35, scrollTrigger: { trigger: head, start: 'top 82%', once: true } });
    gsap.from($$('.ctr', head), { scaleX: 0, opacity: 0, duration: 1.2, ease: EASE, stagger: 0.15, scrollTrigger: { trigger: head, start: 'top 85%', once: true } });
  });
  $$('.sh-bar').forEach(function (b) {
    gsap.from(b, { clipPath: 'inset(0 100% 0 0)', opacity: 0, duration: 1.2, ease: 'power4.inOut', scrollTrigger: { trigger: b, start: 'top 90%', once: true } });
  });

  /* ---- pricing section ---- */
  var feats = $$('#clear .ft');
  if (feats.length) {
    gsap.set(feats, { opacity: 0, y: 60, rotateX: -25, transformPerspective: 700 });
    ScrollTrigger.create({
      trigger: '#clear .sh-feats', start: 'top 82%', once: true,
      onEnter: function () {
        gsap.to(feats, { opacity: 1, y: 0, rotateX: 0, duration: 1.1, ease: EASE, stagger: 0.14, onComplete: function () { feats.forEach(settle); } });
        if (window.anime) {                                    // draw each icon's strokes with anime.js
          feats.forEach(function (f, i) {
            var paths = f.querySelectorAll('path, circle');
            window.anime({
              targets: paths, strokeDashoffset: [window.anime.setDashoffset, 0],
              easing: 'easeInOutSine', duration: 1400, delay: function (_, k) { return 300 + i * 150 + k * 90; }
            });
          });
        }
      }
    });
  }
  $$('#clear .cl-card').forEach(function (c, i) {
    gsap.set(c, { opacity: 0, x: i ? 80 : -80, rotate: i ? 2 : -2 });
    ScrollTrigger.create({
      trigger: c, start: 'top 85%', once: true,
      onEnter: function () { gsap.to(c, { opacity: 1, x: 0, rotate: 0, duration: 1.3, ease: EASE, onComplete: function () { settle(c); } }); }
    });
  });
  var fileRows = $$('#clear .files li');
  if (fileRows.length) {
    gsap.from(fileRows, { x: -30, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.09,
      scrollTrigger: { trigger: '#clear .files', start: 'top 85%', once: true } });
  }

  /* ---- how it works ---- */
  var steps = $$('#story .st');
  if (steps.length) {
    gsap.from(steps, { x: -60, opacity: 0, duration: 1.1, ease: EASE, stagger: 0.14,
      scrollTrigger: { trigger: '#story', start: 'top 70%', once: true } });
    gsap.from($$('#story .num'), { scale: 0.4, opacity: 0, duration: 0.9, ease: 'back.out(2)', stagger: 0.14,
      scrollTrigger: { trigger: '#story', start: 'top 70%', once: true } });
  }

  /* ---- upload / 3D model section ---- */
  var stage = $('#p2mStage');
  if (stage) {
    gsap.from(stage, { clipPath: 'inset(12% 12% 12% 12% round 28px)', scale: 0.9, opacity: 0, duration: 1.6, ease: EASE,
      scrollTrigger: { trigger: stage, start: 'top 85%', once: true } });
    gsap.to(stage, { yPercent: -4, ease: 'none', scrollTrigger: { trigger: stage, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from($$('#p2m .p2m-key > div'), { y: 40, opacity: 0, duration: 0.9, ease: EASE, stagger: 0.14,
      scrollTrigger: { trigger: '.p2m-key', start: 'top 90%', once: true } });
  }

  /* ---- footer ---- */
  gsap.from($$('.hf .hw'), { y: 40, opacity: 0, duration: 1, ease: EASE, stagger: 0.14,
    scrollTrigger: { trigger: '.hf', start: 'top 85%', once: true } });

  /* ---- sub pages (shop / modify / bring) animate each time they are opened ---- */
  var seen = new WeakSet();
  function playPage(page) {
    var sec = $('section', page);
    if (!sec) return;
    var tl = gsap.timeline({ defaults: { ease: EASE } });
    tl.from($('.sh-bar', sec), { clipPath: 'inset(0 100% 0 0)', opacity: 0, duration: 1, ease: 'power4.inOut' })
      .add(function () { headingIn($('h2.lead', sec)); }, '-=0.6')
      .from($('.sub', sec), { y: 20, opacity: 0, duration: 0.8 }, '-=0.5');
    var blocks = $$('.finder, .m2-pick, .m2-win, .bring-grid > .drop', sec);
    if (blocks.length) { blocks.forEach(function (b) { b.classList.add('in'); }); tl.from(blocks, { y: 50, opacity: 0, duration: 1, stagger: 0.12 }, '-=0.5'); }
    var cards = $$('.c3', sec);
    if (cards.length) tl.from(cards, { y: 60, opacity: 0, rotateY: -12, transformPerspective: 800, duration: 1, stagger: 0.14 }, '-=0.6');
    $$('.reveal', sec).forEach(function (el) { el.classList.add('in'); });
  }
  $$('.vpage, #shopPage').forEach(function (page) {
    new MutationObserver(function () {
      if (!page.hidden) { requestAnimationFrame(function () { playPage(page); ScrollTrigger.refresh(); }); }
    }).observe(page, { attributes: true, attributeFilter: ['hidden'] });
  });

  /* shop plan cards are built by script: stagger them in as they appear */
  var grid = $('#pgrid');
  if (grid) {
    new MutationObserver(function () {
      var fresh = $$(':scope > *', grid).filter(function (c) { if (seen.has(c)) return false; seen.add(c); return true; });
      if (fresh.length) gsap.from(fresh, { y: 50, opacity: 0, scale: 0.94, duration: 0.9, ease: EASE, stagger: { each: 0.06, from: 'start' }, clearProps: 'all' });
    }).observe(grid, { childList: true });
  }

  /* ---- hover polish: magnetic buttons + lifting cards ---- */
  if (matchMedia('(hover:hover)').matches) {
    $$('.npill, .stgo, .btn').forEach(function (el) {
      var xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.18);
        yTo((e.clientY - r.top - r.height / 2) * 0.25);
      });
      el.addEventListener('mouseleave', function () { xTo(0); yTo(0); });
    });
    $$('.cl-card, .ft, .c3').forEach(function (el) {
      el.addEventListener('mouseenter', function () { gsap.to(el, { y: -6, duration: 0.4, ease: 'power2.out', overwrite: 'auto' }); });
      el.addEventListener('mouseleave', function () { gsap.to(el, { y: 0, duration: 0.5, ease: 'power2.out', overwrite: 'auto' }); });
    });
  }

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
