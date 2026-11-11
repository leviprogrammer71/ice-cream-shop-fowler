/* ============================================================
   The Ice Cream Shop — interaction + scroll experience
   Vanilla JS, no dependencies.
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ICON_MUTE  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m22 9-6 6M16 9l6 6"/></svg>';
  var ICON_SOUND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';

  /* ---------------- page-load curtain ---------------- */
  var curtain = document.querySelector('.curtain');
  if (curtain) {
    if (reduced) { curtain.remove(); }
    else {
      window.addEventListener('load', function () {
        setTimeout(function () {
          curtain.classList.add('up');
          setTimeout(function () { curtain.remove(); }, 800);
        }, 380);
      });
      // never let a stalled asset trap the page behind the curtain
      setTimeout(function () { if (curtain.isConnected) { curtain.classList.add('up'); } }, 2600);
    }
  }

  /* ---------------- mobile nav ---------------- */
  var head = document.querySelector('.site-head');
  var burger = document.querySelector('.burger');
  var nav = document.querySelector('.site-head .nav');

  // the drawer pins under the header, which shrinks on scroll — keep them in sync
  function syncHeadHeight() {
    if (head) document.documentElement.style.setProperty('--head-h', head.offsetHeight + 'px');
  }
  syncHeadHeight();
  window.addEventListener('resize', syncHeadHeight);
  if (head) head.addEventListener('transitionend', syncHeadHeight);

  if (burger && nav) {
    // the Order CTA is hidden from the bar on mobile — put it in the drawer
    var headCta = document.querySelector('.head-cta');
    if (headCta && !nav.querySelector('.nav-cta')) {
      var clone = headCta.cloneNode(true);
      clone.classList.remove('head-cta', 'sm');
      clone.classList.add('nav-cta');
      nav.appendChild(clone);
    }

    function setNav(open) {
      nav.classList.toggle('open', open);
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open);
      document.body.classList.toggle('nav-open', open);
      if (open) syncHeadHeight();
    }
    burger.addEventListener('click', function () { setNav(!nav.classList.contains('open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });
    // rotating to landscape past the breakpoint must not strand an open drawer
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860 && nav.classList.contains('open')) setNav(false);
    });
  }

  /* ---------------- headline word-splitting ---------------- */
  document.querySelectorAll('[data-split]').forEach(function (el) {
    var html = el.innerHTML;
    // Only word-split plain text (<br> allowed). Anything with nested markup
    // would be shredded by a naive whitespace split — fall back to a block reveal.
    if (/<(?!br\s*\/?>)[a-z]/i.test(html)) {
      el.removeAttribute('data-split');
      el.setAttribute('data-anim', 'up');
      return;
    }
    var w = 0;
    el.innerHTML = html.split(/<br\s*\/?>/i).map(function (line) {
      var words = line.trim().split(/\s+/).filter(Boolean).map(function (word) {
        return '<span class="split-word" style="--w:' + (w++) + '">' + word + '</span>';
      }).join(' ');
      return '<span class="split-line">' + words + '</span>';
    }).join('');
  });

  /* ---------------- reveal on scroll (stagger-aware) ---------------- */
  function autoStagger(root) {
    // NB: .reels is deliberately excluded — its cards carry a baked-in rotation
    // that a transform-based reveal would flatten on completion.
    root.querySelectorAll('.grid, .flavors, .steps, .pills, .stats').forEach(function (g) {
      Array.prototype.forEach.call(g.children, function (child, i) {
        if (!child.hasAttribute('data-anim')) child.setAttribute('data-anim', 'pop');
        if (!child.style.getPropertyValue('--i')) child.style.setProperty('--i', i);
      });
    });
  }
  autoStagger(document);

  // photos and the storefront get a wipe rather than a slide
  document.querySelectorAll('.visit-row > figure, .loc-panel > figure, .medallion, .split figure')
    .forEach(function (el) { if (!el.hasAttribute('data-anim')) el.setAttribute('data-anim', 'mask'); });

  // hours tables cascade row by row
  document.querySelectorAll('.hours').forEach(function (t) {
    Array.prototype.forEach.call(t.rows, function (row, i) { row.style.setProperty('--r', i); });
  });

  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -8%' });
  document.querySelectorAll('.reveal, [data-anim], [data-split], .hours, .divider, .hero-shot')
    .forEach(function (el) { revealIO.observe(el); });

  /* ---------------- scroll-driven layer: progress, parallax, header ---------------- */
  var bar = document.querySelector('.progress');
  var parallax = [].slice.call(document.querySelectorAll('[data-parallax]'));
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || window.pageYOffset;
      var max = document.documentElement.scrollHeight - window.innerHeight;

      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
      document.documentElement.classList.toggle('scrolled', y > 40);

      if (!reduced) {
        parallax.forEach(function (el) {
          var speed = parseFloat(el.dataset.speed || '0.15');
          var r = el.getBoundingClientRect();
          var mid = r.top + r.height / 2 - window.innerHeight / 2;
          el.style.transform = 'translate3d(0,' + (-mid * speed).toFixed(2) + 'px,0)';
        });
      }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------------- auto-rotating hero carousels ---------------- */
  document.querySelectorAll('[data-carousel]').forEach(function (car) {
    var slides = [].slice.call(car.querySelectorAll('.hc-slide'));
    if (slides.length < 2) return;
    var wait = parseInt(car.dataset.interval || '3800', 10);
    var idx = 0, timer = null, visible = true, hovered = false;
    var halo = car.querySelector('.hc-halo');

    // dots
    var dots = document.createElement('div');
    dots.className = 'hc-dots';
    dots.setAttribute('role', 'tablist');
    dots.setAttribute('aria-label', 'Choose a treat');
    slides.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = i === 0 ? 'on' : '';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', i === 0);
      b.setAttribute('aria-label', (s.dataset.label || 'Treat ' + (i + 1)));
      b.addEventListener('click', function () { go(i); restart(); });
      dots.appendChild(b);
    });
    (car.parentNode).insertBefore(dots, car.nextSibling);
    var btns = [].slice.call(dots.children);

    function go(n) {
      if (n === idx) return;
      var prev = slides[idx];
      prev.classList.remove('on');
      prev.classList.add('out');
      // strip the exit class once it has left, so it re-enters from the right
      setTimeout(function () { prev.classList.remove('out'); }, 950);
      idx = (n + slides.length) % slides.length;
      slides[idx].classList.remove('out');
      slides[idx].classList.add('on');
      btns.forEach(function (b, i) {
        b.classList.toggle('on', i === idx);
        b.setAttribute('aria-selected', i === idx);
      });
      if (halo && slides[idx].dataset.halo) halo.style.background = slides[idx].dataset.halo;
    }
    function tick() { go((idx + 1) % slides.length); }
    function start() { if (!timer && !reduced && visible && !hovered) timer = setInterval(tick, wait); }
    function stop() { clearInterval(timer); timer = null; }
    function restart() { stop(); start(); }

    car.addEventListener('mouseenter', function () { hovered = true; stop(); });
    car.addEventListener('mouseleave', function () { hovered = false; start(); });
    dots.addEventListener('mouseenter', function () { hovered = true; stop(); });
    dots.addEventListener('mouseleave', function () { hovered = false; start(); });

    // don't burn cycles while scrolled past
    new IntersectionObserver(function (e) {
      visible = e[0].isIntersecting;
      visible ? start() : stop();
    }, { threshold: 0.2 }).observe(car);

    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });
    start();
  });

  /* ---------------- sticky flavor scrubber ---------------- */
  var scrub = document.querySelector('.scrub');
  if (scrub && !reduced) {
    var items = [].slice.call(scrub.querySelectorAll('.scrub-item'));
    var arts  = [].slice.call(scrub.querySelectorAll('.scrub-art img'));
    var dots  = [].slice.call(scrub.querySelectorAll('.scrub-dots i'));
    var halo  = scrub.querySelector('.halo');
    var last = -1;

    function setActive(i) {
      if (i === last) return;
      last = i;
      items.forEach(function (el, n) { el.classList.toggle('on', n === i); });
      arts.forEach(function (el, n) { el.classList.toggle('on', n === i); });
      dots.forEach(function (el, n) { el.classList.toggle('on', n === i); });
      if (halo && arts[i]) halo.style.background = arts[i].dataset.halo || 'var(--pink)';
    }
    setActive(0);

    // Below 900px the stage is no longer sticky, so there's no scroll distance to
    // scrub against. Fall back to a timer while the section is on screen —
    // otherwise mobile would sit on flavour #1 forever.
    var autoTimer = null;
    function canScrub() { return scrub.getBoundingClientRect().height - window.innerHeight > 0; }

    window.addEventListener('scroll', function () {
      if (!canScrub()) return;
      var r = scrub.getBoundingClientRect();
      var total = r.height - window.innerHeight;
      var p = Math.min(Math.max(-r.top / total, 0), 0.999);
      setActive(Math.floor(p * items.length));
    }, { passive: true });

    new IntersectionObserver(function (e) {
      var onScreen = e[0].isIntersecting;
      clearInterval(autoTimer); autoTimer = null;
      if (onScreen && !canScrub()) {
        autoTimer = setInterval(function () { setActive((last + 1) % items.length); }, 3000);
      }
    }, { threshold: 0.25 }).observe(scrub);
  } else if (scrub) {
    scrub.querySelectorAll('.scrub-item, .scrub-art img, .scrub-dots i').forEach(function (el) { el.classList.add('on'); });
  }

  /* ---------------- count-up stats ---------------- */
  var numIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      numIO.unobserve(en.target);
      var el = en.target;
      var target = parseFloat(el.dataset.count);
      var dec = (el.dataset.count.split('.')[1] || '').length;
      var suffix = el.dataset.suffix || '';
      if (reduced) { el.textContent = target.toFixed(dec) + suffix; return; }
      var t0 = performance.now(), dur = 1400;
      (function step(now) {
        var p = Math.min((now - t0) / dur, 1);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * e).toFixed(dec) + suffix;
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-count]').forEach(function (el) { numIO.observe(el); });

  /* ---------------- magnetic buttons ---------------- */
  if (!reduced && window.matchMedia('(hover:hover)').matches) {
    document.querySelectorAll('.btn').forEach(function (b) {
      b.addEventListener('mousemove', function (e) {
        var r = b.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.28;
        var y = (e.clientY - r.top - r.height / 2) * 0.38;
        b.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      });
      b.addEventListener('mouseleave', function () { b.style.transform = ''; });
    });

    /* ---------------- hero stage: mouse-parallax tilt ---------------- */
    document.querySelectorAll('[data-tilt]').forEach(function (el) {
      var host = el.closest('.hero-art, .ha-stage, .hb-stage') || el.parentElement;
      host.addEventListener('mousemove', function (e) {
        var r = host.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - 0.5) * -7;
        var ry = ((e.clientX - r.left) / r.width - 0.5) * 11;
        el.style.transform = 'perspective(1100px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) scale(1.02)';
      });
      host.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });

    /* ---------------- card tilt ---------------- */
    document.querySelectorAll('.card').forEach(function (c) {
      c.addEventListener('mousemove', function (e) {
        var r = c.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - 0.5) * -9;
        var ry = ((e.clientX - r.left) / r.width - 0.5) * 9;
        c.style.transform = 'perspective(700px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-6px)';
      });
      c.addEventListener('mouseleave', function () { c.style.transform = ''; });
    });
  }

  /* ---------------- videos: play only while visible ---------------- */
  var vio = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var v = en.target;
      if (en.isIntersecting) { var p = v.play(); if (p) p.catch(function () {}); }
      else { v.pause(); }
    });
  }, { threshold: 0.35 });
  document.querySelectorAll('video[data-autoplay]').forEach(function (v) { vio.observe(v); });

  /* ---------------- reel sound toggle ---------------- */
  document.querySelectorAll('.sound').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      var v = btn.closest('.reel, .medallion').querySelector('video');
      v.muted = !v.muted;
      btn.innerHTML = v.muted ? ICON_MUTE : ICON_SOUND;
      btn.setAttribute('aria-label', v.muted ? 'Unmute video' : 'Mute video');
      if (!v.muted) v.play().catch(function () {});
    });
  });

  /* ---------------- contact form (static site — no backend) ---------------- */
  var form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = document.getElementById('formNote');
      note.textContent = 'Thanks! This demo form isn’t wired to a mailbox yet — call (559) 400-9142 or DM @theicecreamshopfresno and we’ll get right back to you.';
      note.style.display = 'block';
      form.reset();
    });
  }
})();
