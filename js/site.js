/* SKALA 01 — Operator Movement · site behaviour
   No network calls. Contact text lives in memory only. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Brush font fallback ---------- */
  if (document.fonts && document.fonts.load) {
    document.fonts.load('1em "Permanent Marker"').then(function (faces) {
      if (!faces || !faces.length) root.classList.add('no-brush');
    }).catch(function () { root.classList.add('no-brush'); });
  }

  /* ---------- Header state ---------- */
  var header = document.querySelector('.site-header');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Header wordmark: scroll to the very top (the sticky header itself is #top, so let scrolling be explicit). */
  var brand = document.querySelector('.wordmark--header');
  if (brand && brand.getAttribute('href') === '#top') {
    brand.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, left: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      if (history.replaceState) history.replaceState(null, '', window.location.pathname + window.location.search);
    });
  }

  /* ---------- Mobile navigation ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var panel = document.getElementById('nav-panel');
  var toggleLabel = toggle.querySelector('.nav-toggle__label');
  function navOpen() { return toggle.getAttribute('aria-expanded') === 'true'; }
  function setNav(open) {
    toggle.setAttribute('aria-expanded', String(open));
    panel.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    toggleLabel.textContent = open ? 'Close' : 'Menu';
  }
  toggle.addEventListener('click', function () { setNav(!navOpen()); });
  panel.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navOpen()) { setNav(false); toggle.focus(); }
  });
  var desktopNav = window.matchMedia('(min-width: 900px)');
  var onNavMedia = function (e) { if (e.matches && navOpen()) setNav(false); };
  if (desktopNav.addEventListener) desktopNav.addEventListener('change', onNavMedia); else desktopNav.addListener(onNavMedia);

  /* ---------- Hero underline ---------- */
  var underlined = document.querySelector('.hero__line--underlined');
  if (underlined) {
    var draw = function () { underlined.classList.add('is-drawn'); };
    if (reduceMotion.matches) draw();
    else if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { requestAnimationFrame(draw); });
    else window.setTimeout(draw, 120);
  }

  /* ---------- Service rows ----------
     All rows start closed. Opening a row closes the others. */
  var rowToggles = Array.prototype.slice.call(document.querySelectorAll('.service-row__toggle'));
  /* One row open at a time at every width (owner-directed 18 Sept). */
  var singleOpen = { matches: true };
  function setRow(btn, open) {
    var region = document.getElementById(btn.getAttribute('aria-controls'));
    btn.setAttribute('aria-expanded', String(open));
    region.hidden = !open;
    btn.closest('.service-row').classList.toggle('is-open', open);
  }
  rowToggles.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      if (!open && singleOpen.matches) {
        rowToggles.forEach(function (other) { if (other !== btn) setRow(other, false); });
      }
      setRow(btn, !open);
    });
  });

  /* Every time the hero scrolls out of view, the Store Operations row tugs and yo-yos twice to show it opens. */
  var hero = document.querySelector('.hero');
  var firstRow = rowToggles.length ? rowToggles[0].closest('.service-row') : null;
  if (hero && firstRow && !reduceMotion.matches && 'IntersectionObserver' in window) {
    var heroWasVisible = null;
    var nudge = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var visible = entry.isIntersecting;
        if (heroWasVisible === true && !visible && rowToggles[0].getAttribute('aria-expanded') !== 'true') {
          firstRow.classList.remove('is-nudged');
          void firstRow.offsetWidth;   /* restart the animation from the top */
          firstRow.classList.add('is-nudged');
        }
        heroWasVisible = visible;
      });
    }, { threshold: 0 });
    nudge.observe(hero);
  }

  /* ---------- Illustrative workboard ---------- */
  var STATUSES = [
    { key: 'building', label: 'Building' },
    { key: 'testing', label: 'Testing' },
    { key: 'in-use', label: 'In use' }
  ];
  var boardLive = document.getElementById('board-live');
  var statusButtons = Array.prototype.slice.call(document.querySelectorAll('.status-btn'));
  function statusIndex(key) {
    for (var i = 0; i < STATUSES.length; i++) if (STATUSES[i].key === key) return i;
    return 0;
  }
  function setStatus(btn, key) {
    btn.setAttribute('data-status', key);
    btn.querySelector('.status-btn__text').textContent = STATUSES[statusIndex(key)].label;
  }
  var stamp = document.getElementById('board-stamp');
  function allInUse() {
    return statusButtons.length > 0 && statusButtons.every(function (b) { return b.getAttribute('data-status') === 'in-use'; });
  }
  function checkReady(message) {
    var ready = allInUse();
    if (stamp) stamp.classList.toggle('is-pending', !ready);
    boardLive.textContent = ready ? message + ' Every row is in use. Expansion ready.' : message;
  }
  if (stamp) stamp.classList.toggle('is-pending', !allInUse());
  statusButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = STATUSES[(statusIndex(btn.getAttribute('data-status')) + 1) % STATUSES.length];
      setStatus(btn, next.key);
      checkReady(btn.getAttribute('data-work') + ' is now ' + next.label + '.');
    });
  });
  var resetBtn = document.getElementById('board-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      statusButtons.forEach(function (btn) { setStatus(btn, btn.getAttribute('data-initial')); });
      checkReady('Example reset to its starting statuses.');
    });
  }

  /* ---------- Playbook: hover a play, the pull quote changes ----------
     Every quote is in the DOM stacked on one grid cell, so the block keeps
     the height of the tallest one and the page never jumps. */
  var pull = document.querySelector('.notes__pull');
  if (pull) {
    var items = Array.prototype.slice.call(pull.querySelectorAll('.notes__pull-item'));
    function showQuote(key) {
      items.forEach(function (it) {
        var on = it.getAttribute('data-quote-for') === key;
        it.classList.toggle('is-active', on);
        if (on) it.removeAttribute('aria-hidden'); else it.setAttribute('aria-hidden', 'true');
      });
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-quote-for]:not(.notes__pull-item)'), function (el) {
      var show = function () { showQuote(el.getAttribute('data-quote-for')); };
      var reset = function () { showQuote('default'); };
      el.addEventListener('mouseenter', show);
      el.addEventListener('focusin', show);
      el.addEventListener('mouseleave', reset);
      el.addEventListener('focusout', reset);
    });
  }

  /* ---------- Notebook card: a tap signs it on touch screens (hover does it elsewhere) ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.notebook'), function (card) {
    card.addEventListener('click', function () { card.classList.toggle('is-signed'); });
  });

  /* ---------- Field note articles ---------- */
  var supportsModal = typeof window.HTMLDialogElement === 'function' &&
    typeof window.HTMLDialogElement.prototype.showModal === 'function';
  var lastOpener = null;

  function openNote(dlg, opener) {
    lastOpener = opener;
    if (supportsModal) {
      dlg.showModal();
    } else {
      dlg.classList.add('is-inline');
      dlg.setAttribute('open', '');
      opener.closest('.note').appendChild(dlg);
    }
    var heading = dlg.querySelector('.note-article__title');
    if (heading) heading.focus();
  }
  function closeNote(dlg) {
    if (supportsModal) { if (dlg.open) dlg.close(); }
    else { dlg.removeAttribute('open'); }
    if (lastOpener) { lastOpener.focus(); lastOpener = null; }
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-open-note]'), function (btn) {
    var dlg = document.getElementById(btn.getAttribute('data-open-note'));
    if (!dlg) return;
    btn.addEventListener('click', function () { openNote(dlg, btn); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.note-dialog'), function (dlg) {
    Array.prototype.forEach.call(dlg.querySelectorAll('[data-close-note]'), function (el) {
      el.addEventListener('click', function () { closeNote(dlg); });
    });
    /* Escape closes natively; restore focus afterwards */
    dlg.addEventListener('close', function () { if (lastOpener) { lastOpener.focus(); lastOpener = null; } });
    /* Click on the backdrop closes */
    dlg.addEventListener('click', function (e) { if (e.target === dlg) closeNote(dlg); });
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeNote(dlg); });
  });

  /* ---------- Contact draft ---------- */
  var form = document.getElementById('contact-form');
  var draft = document.getElementById('draft');
  var draftBody = document.getElementById('draft-body');
  var draftStatus = document.getElementById('draft-status');
  var formLive = document.getElementById('form-live');
  var draftText = '';

  var fields = {
    name: { el: document.getElementById('f-name'), err: document.getElementById('err-name'), msg: 'Add your name.',
      valid: function (v) { return v.trim().length > 0; } },
    email: { el: document.getElementById('f-email'), err: document.getElementById('err-email'), msg: 'Enter a valid email address.',
      valid: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); } },
    message: { el: document.getElementById('f-message'), err: document.getElementById('err-message'), msg: 'Tell us a little about the work.',
      valid: function (v) { return v.trim().length > 0; } }
  };
  var company = document.getElementById('f-company');

  function setError(f, show) {
    f.err.hidden = !show;
    f.err.textContent = show ? f.msg : '';
    if (show) f.el.setAttribute('aria-invalid', 'true'); else f.el.removeAttribute('aria-invalid');
  }
  function validate() {
    var firstBad = null;
    Object.keys(fields).forEach(function (k) {
      var f = fields[k];
      var ok = f.valid(f.el.value);
      setError(f, !ok);
      if (!ok && !firstBad) firstBad = f.el;
    });
    return firstBad;
  }
  if (form) Object.keys(fields).forEach(function (k) {
    var f = fields[k];
    f.el.addEventListener('input', function () { if (f.el.getAttribute('aria-invalid') === 'true' && f.valid(f.el.value)) setError(f, false); });
  });

  function buildDraft() {
    var lines = [
      'Inquiry for SKALA',
      '',
      'Name: ' + fields.name.el.value.trim(),
      'Work email: ' + fields.email.el.value.trim(),
      'Company: ' + (company.value.trim() || '—'),
      '',
      'What I am working toward:',
      fields.message.el.value.trim()
    ];
    return lines.join('\n');
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = validate();
      if (firstBad) { firstBad.focus(); formLive.textContent = 'Check the highlighted fields.'; return; }
      draftText = buildDraft();
      draftBody.textContent = draftText;
      draftStatus.textContent = '';
      form.hidden = true;
      draft.hidden = false;
      formLive.textContent = 'Your draft is ready. Nothing has been sent.';
      draft.focus();
    });

    document.getElementById('draft-edit').addEventListener('click', function () {
      draft.hidden = true;
      form.hidden = false;
      draftStatus.textContent = '';
      fields.name.el.focus();
    });

    function selectDraft() {
      try {
        var range = document.createRange();
        range.selectNodeContents(draftBody);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (err) { /* selection is still possible by hand */ }
      draftBody.focus();
    }
    function copyFailed() {
      draftStatus.textContent = 'Select and copy your inquiry below.';
      selectDraft();
    }
    document.getElementById('draft-copy').addEventListener('click', function () {
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
        navigator.clipboard.writeText(draftText).then(function () {
          draftStatus.textContent = 'Inquiry copied.';
        }, copyFailed);
      } else {
        copyFailed();
      }
    });
  }

  /* ---------- Enter motion ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    Array.prototype.forEach.call(reveals, function (el) { io.observe(el); });
    /* Safety net: nothing stays parked invisible if the observer never fires */
    window.setTimeout(function () { Array.prototype.forEach.call(reveals, function (el) { el.classList.add('is-in'); }); }, 2500);
  }
})();
