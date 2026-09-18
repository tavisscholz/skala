/* SKALA 01 — Operator Movement · site behaviour
   No network calls. Contact text lives in memory only. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Brush font fallback ---------- */
  /* Fall back to the drawn mark only when the wordmark face itself fails to load.
     (Safari answers fonts.load() with an empty list even when the face is fine, so that is not a signal.) */
  if (document.fonts && document.fonts.forEach) {
    var wordmarkFace = null;
    document.fonts.forEach(function (face) {
      if (!wordmarkFace && face.family.replace(/["']/g, '') === 'Oracle Brush') wordmarkFace = face;
    });
    if (wordmarkFace) {
      wordmarkFace.load().then(function () {
        if (wordmarkFace.status === 'error') root.classList.add('no-brush');
      }).catch(function () { root.classList.add('no-brush'); });
    }
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
      var before = btn.getBoundingClientRect().top;
      if (!open && singleOpen.matches) {
        rowToggles.forEach(function (other) { if (other !== btn) setRow(other, false); });
      }
      setRow(btn, !open);
      /* Closing a row above this one pulls the page up; scroll by the difference so the tapped tag stays where it was. */
      var shift = btn.getBoundingClientRect().top - before;
      if (Math.abs(shift) > 1) window.scrollBy({ top: shift, left: 0, behavior: 'instant' });
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
          var list = firstRow.parentElement;
          list.classList.add('is-nudging');
          clearTimeout(list._nudgeTimer);
          list._nudgeTimer = setTimeout(function () { list.classList.remove('is-nudging'); }, 1200);
        }
        heroWasVisible = visible;
      });
    }, { threshold: 0 });
    nudge.observe(hero);
  }

  /* ---------- Readiness board: the SCALE stages, with progress that sticks ----------
     Every stage has three steps. A step is Building or In use; click to switch. Progress is kept in
     localStorage so it survives moving between stages and reloading. A stage whose three steps are
     all in use lights its tile acid. When every step of every stage is in use, the system is ready
     to scale and the page celebrates. */
  var STAGES = [
    { label: 'Start here: uncover the gaps.', stamp: 'Siloed.', line: 'You identified the know-how.', rows: [
      'Identify who people rely on to get critical work done',
      'Observe how that work happens at different locations',
      'Pinpoint where work stalls when those people are unavailable' ] },
    { label: 'From Siloed to Captured', stamp: 'Captured.', line: 'You got it out of people’s heads.', rows: [
      'Agree on the standard for each critical task',
      'Turn it into a simple checklist or practical guide',
      'Assign someone to keep it current and accessible' ] },
    { label: 'From Captured to Adopted', stamp: 'Adopted.', line: 'You made it part of everyday work.', rows: [
      'Train teams using the tools in the actual operation',
      'Observe execution and coach where standards slip',
      'Fix what makes the tools difficult to use' ] },
    { label: 'From Adopted to Linked', stamp: 'Linked.', line: 'You manage it across locations.', rows: [
      'Use the same measures and reporting across locations',
      'Review gaps regularly and assign corrective actions',
      'Share improvements and update standards across the business' ] },
    { label: 'From Linked to Expansion-ready', stamp: 'Expansion ready.', line: 'Take it to the next location.', rows: [
      'Hand the tools to a new location without changes',
      'Run onboarding without the person who built it',
      'Start the review rhythm in every new location on day one' ] }
  ];
  var STORE_KEY = 'skala-scale-progress';
  var boardLive = document.getElementById('board-live');
  var board = document.querySelector('.workboard');
  var stamp = document.getElementById('board-stamp');
  var stampWord = stamp && stamp.querySelector('.board-stamp__word');
  var stampLine = stamp && stamp.querySelector('.board-stamp__line');
  var ladder = document.querySelector('.ladder');
  var steps = ladder ? Array.prototype.slice.call(ladder.querySelectorAll('.ladder__step')) : [];
  var boardLabel = document.querySelector('.workboard__head .eyebrow');
  var boardRows = Array.prototype.slice.call(document.querySelectorAll('.workboard__table tbody tr'));
  var readySection = document.getElementById('ready');

  function freshProgress() { return STAGES.map(function (s) { return s.rows.map(function () { return false; }); }); }
  function loadProgress() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      var data = raw && JSON.parse(raw);
      if (data && data.stages && data.stages.length === STAGES.length) return data;
    } catch (e) {}
    return { stages: freshProgress(), celebrated: false };
  }
  function saveProgress() { try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch (e) {} }
  var progress = loadProgress();
  function stageDone(i) { return progress.stages[i].every(Boolean); }
  function allDone() { return progress.stages.every(function (s) { return s.every(Boolean); }); }

  function setStatus(btn, inUse) {
    btn.setAttribute('data-status', inUse ? 'in-use' : 'building');
    btn.setAttribute('aria-pressed', String(inUse));
    btn.querySelector('.status-btn__text').textContent = inUse ? 'In use' : 'Building';
  }
  var pinnedStage = STAGES.length - 1;
  var currentStage = pinnedStage;
  function paintStamp() {
    if (!stamp) return;
    stamp.classList.toggle('is-pending', !stageDone(currentStage));
  }
  function paintSteps(active) {
    steps.forEach(function (s, k) {
      s.classList.toggle('is-active', k === active);
      s.classList.toggle('is-muted', k !== active);
      s.classList.toggle('is-complete', stageDone(k));
      s.setAttribute('aria-current', k === pinnedStage ? 'true' : 'false');
    });
    if (board) board.classList.toggle('is-scaled', allDone());
    if (readySection) readySection.classList.toggle('is-scaled', allDone());
  }
  function showStage(i, announce) {
    var st = STAGES[i]; currentStage = i;
    if (boardLabel) boardLabel.textContent = st.label;
    boardRows.forEach(function (tr, r) {
      var cells = tr.children;
      cells[0].textContent = String(r + 1); cells[1].textContent = st.rows[r];
      var btn = tr.querySelector('.status-btn');
      btn.setAttribute('data-work', 'Step ' + (r + 1));
      setStatus(btn, progress.stages[i][r]);
    });
    if (stampWord) stampWord.textContent = st.stamp;
    if (stampLine) stampLine.textContent = st.line;
    paintStamp();
    if (announce && boardLive) boardLive.textContent = 'Board now shows: ' + st.label + '.';
  }
  function previewStep(step) {
    var i = steps.indexOf(step);
    if (i === currentStage) return;
    paintSteps(i); showStage(i, false);
  }
  function pinStep(step) {
    pinnedStage = steps.indexOf(step);
    paintSteps(pinnedStage); showStage(pinnedStage, true);
  }
  function restStep() {
    paintSteps(pinnedStage);
    if (currentStage !== pinnedStage) showStage(pinnedStage, false);
  }
  steps.forEach(function (step) {
    step.addEventListener('mouseenter', function () { previewStep(step); });
    step.addEventListener('focus', function () { previewStep(step); });
    step.addEventListener('click', function () { pinStep(step); });
    step.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pinStep(step); } });
  });
  if (ladder) {
    ladder.addEventListener('mouseleave', restStep);
    ladder.addEventListener('focusout', function (e) { if (!ladder.contains(e.relatedTarget)) restStep(); });
  }

  /* Status buttons toggle the step for the stage on show */
  boardRows.forEach(function (tr, r) {
    var btn = tr.querySelector('.status-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var wasStageDone = stageDone(currentStage);
      var next = !progress.stages[currentStage][r];
      progress.stages[currentStage][r] = next;
      setStatus(btn, next);
      var msg = 'Step ' + (r + 1) + ' is now ' + (next ? 'In use' : 'Building') + '.';
      if (!wasStageDone && stageDone(currentStage)) msg += ' ' + STAGES[currentStage].stamp + ' ' + STAGES[currentStage].line;
      if (!next) progress.celebrated = false;
      saveProgress();
      paintStamp(); paintSteps(currentStage);
      if (allDone() && !progress.celebrated) { progress.celebrated = true; saveProgress(); hoopla(); msg += ' Every stage is in use. Ready to scale.'; }
      if (boardLive) boardLive.textContent = msg;
    });
  });

  /* ---------- Ready to scale: the celebration ---------- */
  var hooplaEl = null;
  function hoopla() {
    if (!readySection) return;
    if (!hooplaEl) {
      hooplaEl = document.createElement('div');
      hooplaEl.className = 'hoopla';
      hooplaEl.setAttribute('role', 'dialog');
      hooplaEl.setAttribute('aria-modal', 'true');
      hooplaEl.setAttribute('aria-labelledby', 'hoopla-title');
      hooplaEl.innerHTML =
        '<div class="hoopla__bits" aria-hidden="true"></div>' +
        '<div class="hoopla__card">' +
        '  <p class="eyebrow">Every stage in use</p>' +
        '  <p class="hoopla__title brush" id="hoopla-title">Ready<br>to scale.</p>' +
        '  <p class="hoopla__line">Siloed, Captured, Adopted, Linked, Expansion-ready. The system holds without the person who built it, and the next location inherits it.</p>' +
        '  <svg class="hoopla__crown mark-crown" aria-hidden="true" focusable="false"><use href="#mark-crown"/></svg>' +
        '  <button class="button button--ink hoopla__close" type="button">Keep building <span class="arrow" aria-hidden="true">→</span></button>' +
        '</div>';
      document.body.appendChild(hooplaEl);
      hooplaEl.querySelector('.hoopla__close').addEventListener('click', closeHoopla);
      hooplaEl.addEventListener('click', function (e) { if (e.target === hooplaEl) closeHoopla(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && hooplaEl.classList.contains('is-open')) closeHoopla(); });
    }
    var bits = hooplaEl.querySelector('.hoopla__bits');
    bits.innerHTML = '';
    if (!reduceMotion.matches) {
      var colours = ['acid', 'acid', 'white', 'ink', 'acid'];
      for (var i = 0; i < 140; i++) {
        var bit = document.createElement('i');
        bit.className = 'hoopla__bit hoopla__bit--' + colours[i % colours.length];
        bit.style.left = (Math.random() * 100) + '%';
        bit.style.animationDelay = (Math.random() * 1.6) + 's';
        bit.style.animationDuration = (2.6 + Math.random() * 2.2) + 's';
        bit.style.transform = 'rotate(' + Math.round(Math.random() * 360) + 'deg)';
        bit.style.width = (8 + Math.random() * 8) + 'px';
        bit.style.height = (12 + Math.random() * 12) + 'px';
        bits.appendChild(bit);
      }
    }
    hooplaEl.classList.add('is-open');
    document.body.classList.add('has-hoopla');
    hooplaEl.querySelector('.hoopla__close').focus();
  }
  function closeHoopla() {
    if (!hooplaEl) return;
    hooplaEl.classList.remove('is-open');
    document.body.classList.remove('has-hoopla');
    if (board) board.scrollIntoView({ block: 'center' });
  }

  var resetBtn = document.getElementById('board-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      progress = { stages: freshProgress(), celebrated: false };
      saveProgress();
      showStage(currentStage, false); paintSteps(currentStage);
      if (boardLive) boardLive.textContent = 'Every step is back to Building.';
    });
  }
  if (ladder && boardRows.length) { paintSteps(pinnedStage); showStage(pinnedStage, false); }

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
