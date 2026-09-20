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
    { label: 'From Linked to Expansion-ready', stamp: 'You\u2019re ready to scale.', line: 'Take it to the next location.', rows: [
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

  /* On phones the board is hidden and tiles are the checklist, so Siloed
     starts checked: it is the condition every business already has. */
  var phone = window.matchMedia('(max-width: 767px)');
  function freshProgress() {
    return STAGES.map(function (s, i) { return s.rows.map(function () { return phone.matches && i === 0; }); });
  }
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
    btn.querySelector('.status-btn__text').textContent = inUse ? 'Done' : 'Working on';
  }
  var pinnedStage = 0;   /* Siloed is where every business starts */
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
  /* On phones the board is hidden: tapping a tile checks the whole stage off (or back on). */
  function toggleStage(step) {
    var i = steps.indexOf(step);
    var done = !stageDone(i);
    progress.stages[i] = progress.stages[i].map(function () { return done; });
    if (!done) progress.celebrated = false;
    saveProgress();
    pinnedStage = i; currentStage = i;
    showStage(i, false); paintSteps(i);
    var msg = STAGES[i].stamp + (done ? ' ' + STAGES[i].line : ' Back to working on it.');
    if (allDone() && !progress.celebrated) { progress.celebrated = true; saveProgress(); hoopla(); msg += ' Every stage is done. Ready to scale.'; }
    if (boardLive) boardLive.textContent = msg;
  }
  function activate(step) { if (phone.matches) toggleStage(step); else pinStep(step); }
  steps.forEach(function (step) {
    step.addEventListener('mouseenter', function () { if (!phone.matches) previewStep(step); });
    step.addEventListener('focus', function () { if (!phone.matches) previewStep(step); });
    step.addEventListener('click', function () { activate(step); });
    step.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(step); } });
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
      var msg = 'Step ' + (r + 1) + ' is now ' + (next ? 'Done' : 'Working on') + '.';
      if (!wasStageDone && stageDone(currentStage)) msg += ' ' + STAGES[currentStage].stamp + ' ' + STAGES[currentStage].line;
      if (!next) progress.celebrated = false;
      saveProgress();
      paintStamp(); paintSteps(currentStage);
      if (allDone() && !progress.celebrated) { progress.celebrated = true; saveProgress(); hoopla(); msg += ' Every stage is done. Ready to scale.'; }
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
        '<div class="hoopla__card">' +
        '  <p class="eyebrow">Every stage done</p>' +
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
    hooplaEl.classList.add('is-open');
    document.body.classList.add('has-hoopla');
    hooplaEl.querySelector('.hoopla__close').focus();
  }
  function closeHoopla() {
    if (!hooplaEl) return;
    hooplaEl.classList.remove('is-open');
    document.body.classList.remove('has-hoopla');
    var target = phone.matches ? ladder : board;
    if (target) target.scrollIntoView({ block: 'center' });
  }

  var resetBtn = document.getElementById('board-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      progress = { stages: freshProgress(), celebrated: false };
      saveProgress();
      showStage(currentStage, false); paintSteps(currentStage);
      if (boardLive) boardLive.textContent = 'Every step is back to Working on.';
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

  /* ---------- Listen: read a play aloud ----------
     A recorded MP3 is used when the build found one (data-audio). Otherwise
     the device's own voice reads the article through the Web Speech API.
     One player runs at a time; closing a dialog or leaving the page stops it. */
  (function () {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-listen]'));
    if (!buttons.length) return;
    var synth = window.speechSynthesis;
    var canSpeak = !!(synth && window.SpeechSynthesisUtterance);
    var active = null;

    /* Playback speed: one preset list, remembered per device, applied to both players. */
    var RATES = [1.1, 1.25, 1.5, 2, 0.8, 1], RATE_KEY = 'skala-listen-rate', rate = 1.1;   /* 1.1 is the house default: the narrator reads a touch slow */
    try { var savedRate = parseFloat(localStorage.getItem(RATE_KEY)); if (RATES.indexOf(savedRate) !== -1) rate = savedRate; } catch (e) {}
    function rateLabel(r) { return String(r) + '\u00d7'; }
    function paintSpeed(pill) { if (!pill) return; pill.querySelector('.speed__label').textContent = rateLabel(rate); pill.setAttribute('aria-label', 'Playback speed, ' + rate + ' times'); }
    function speedPillFor(btn) { var line = btn.closest('.note-article__byline'); return line ? line.querySelector('.speed') : null; }
    Array.prototype.forEach.call(document.querySelectorAll('.speed'), function (pill) {
      paintSpeed(pill);
      pill.addEventListener('click', function () {
        rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
        try { localStorage.setItem(RATE_KEY, String(rate)); } catch (e) {}
        Array.prototype.forEach.call(document.querySelectorAll('.speed'), paintSpeed);
        if (active && active.setRate) active.setRate(rate);
      });
    });

    function fmt(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2); }
    function paint(btn, state, time) {
      btn.setAttribute('data-state', state);
      btn.setAttribute('aria-pressed', state === 'playing' ? 'true' : 'false');
      btn.querySelector('.listen__label').textContent = state === 'playing' ? 'Pause' : state === 'paused' ? 'Resume' : state === 'loading' ? 'Loading' : 'Listen';
      btn.querySelector('.listen__time').textContent = time || '';
      var pill = speedPillFor(btn); if (pill) pill.hidden = (state === 'idle');
    }
    function stopActive() { if (active) { var a = active; active = null; a.stop(); } }

    /* The article as a list of short spoken chunks: title, standfirst, then the body in order. */
    function script(btn) {
      var art = btn.closest('article');
      var out = [];
      function push(t) { t = (t || '').replace(/\s+/g, ' ').trim(); if (!t) return; if (!/[.!?…]["”’)]*$/.test(t)) t += '.'; out.push(t); }
      var title = art.querySelector('.note-article__title'); if (title) push(title.textContent);
      var stand = art.querySelector('.note-article__stand'); if (stand) push(stand.textContent);
      var body = art.querySelector('.note-article__body');
      Array.prototype.forEach.call(body ? body.children : [], function (el) {
        if (el.matches('h3')) { push(el.textContent); return; }
        if (el.matches('blockquote')) { var c = el.querySelector('cite'); push(el.querySelector('p') ? el.querySelector('p').textContent : el.textContent); if (c) push(c.textContent); return; }
        if (el.matches('aside')) { Array.prototype.forEach.call(el.querySelectorAll('p, li'), function (x) { push(x.textContent); }); return; }
        if (el.matches('ul, ol')) { Array.prototype.forEach.call(el.querySelectorAll('li'), function (x) { push(x.textContent); }); return; }
        if (el.matches('.note-table__wrap')) { Array.prototype.forEach.call(el.querySelectorAll('tr'), function (r) { push(Array.prototype.map.call(r.children, function (c) { return c.textContent.trim(); }).join(', ')); }); return; }
        push(el.textContent);
      });
      var closer = art.querySelector('.note-article__closer'); if (closer) push(closer.textContent);
      /* Long paragraphs get cut off by some engines; split them at sentence ends. */
      var chunks = [];
      out.forEach(function (t) {
        var parts = t.match(/[^.!?…]+[.!?…]+["”’)]*\s*|[^.!?…]+$/g) || [t];
        var buf = '';
        parts.forEach(function (p) { if (buf && (buf + p).length > 220) { chunks.push(buf.trim()); buf = ''; } buf += p; });
        if (buf.trim()) chunks.push(buf.trim());
      });
      return chunks;
    }
    function pickVoice() {
      var voices = synth.getVoices();
      var en = voices.filter(function (v) { return /^en[-_]/i.test(v.lang); });
      var prefer = ['Samantha', 'Ava', 'Allison', 'Daniel', 'Karen', 'Moira', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Microsoft Guy', 'Google UK English Male'];
      for (var i = 0; i < prefer.length; i++) {
        for (var j = 0; j < en.length; j++) if (en[j].name.indexOf(prefer[i]) === 0) return en[j];
      }
      return en.filter(function (v) { return v.localService && /US/i.test(v.lang); })[0] || en[0] || voices[0] || null;
    }
    function whenVoicesReady(cb) {
      if (synth.getVoices().length) { cb(); return; }
      var done = false;
      function go() { if (done) return; done = true; cb(); }
      synth.addEventListener('voiceschanged', go, { once: true });
      window.setTimeout(go, 600);
    }

    function speechPlayer(btn) {
      var chunks = script(btn), i = 0, ended = false, elapsed = 0, startedAt = 0, timer = null, gen = 0, restartOnResume = false;
      var words = chunks.join(' ').split(' ').length, estimate = Math.round(words / 2.6);
      function tick() { paint(btn, 'playing', fmt(elapsed + (Date.now() - startedAt) / 1000) + ' / ' + fmt(estimate)); }
      function finish() { if (ended) return; ended = true; window.clearInterval(timer); paint(btn, 'idle'); if (active && active.btn === btn) active = null; }
      function next() {
        if (ended) return;
        if (i >= chunks.length) { finish(); return; }
        var u = new SpeechSynthesisUtterance(chunks[i++]);
        var v = pickVoice(); if (v) u.voice = v;
        u.rate = rate; u.pitch = 1;
        var myGen = ++gen;
        u.onend = function () { if (!ended && myGen === gen) next(); };
        u.onerror = function (e) { if (e.error === 'interrupted' || e.error === 'canceled') return; if (!ended && myGen === gen) next(); };
        synth.speak(u);
      }
      var me = {
        btn: btn,
        stop: function () { ended = true; window.clearInterval(timer); synth.cancel(); paint(btn, 'idle'); },
        pause: function () { elapsed += (Date.now() - startedAt) / 1000; window.clearInterval(timer); synth.pause(); paint(btn, 'paused', fmt(elapsed) + ' / ' + fmt(estimate)); },
        setRate: function () {
          if (ended) return;
          gen++; i = Math.max(0, i - 1); synth.cancel();
          if (me.paused) { restartOnResume = true; } else { next(); }
        },
        resume: function () {
          startedAt = Date.now(); timer = window.setInterval(tick, 500); tick();
          if (restartOnResume) { restartOnResume = false; next(); return; }
          synth.resume();
          /* Some phones drop a paused queue; pick up at the current chunk. */
          window.setTimeout(function () { if (!ended && !synth.speaking && !synth.pending) { i = Math.max(0, i - 1); synth.cancel(); next(); } }, 400);
        },
        paused: false
      };
      paint(btn, 'loading');
      whenVoicesReady(function () { if (ended) return; startedAt = Date.now(); timer = window.setInterval(tick, 500); tick(); next(); });
      return me;
    }

    function audioPlayer(btn, src) {
      var a = new Audio(src), ended = false;
      a.preload = 'metadata';
      a.playbackRate = rate; a.preservesPitch = true; a.mozPreservesPitch = true;
      function show(state) { paint(btn, state, isFinite(a.duration) && a.duration > 0 ? fmt(a.currentTime) + ' / ' + fmt(a.duration) : fmt(a.currentTime)); }
      a.addEventListener('timeupdate', function () { if (!ended && !a.paused) show('playing'); });
      a.addEventListener('ended', function () { ended = true; paint(btn, 'idle'); if (active && active.btn === btn) active = null; });
      a.addEventListener('error', function () { ended = true; paint(btn, 'idle'); if (active && active.btn === btn) active = null; });
      var me = {
        btn: btn,
        stop: function () { ended = true; a.pause(); a.src = ''; paint(btn, 'idle'); },
        pause: function () { a.pause(); show('paused'); },
        resume: function () { a.play(); show('playing'); },
        setRate: function (r) { a.playbackRate = r; },
        paused: false
      };
      paint(btn, 'loading');
      var p = a.play(); if (p && p.catch) p.catch(function () { me.stop(); });
      return me;
    }

    buttons.forEach(function (btn) {
      var src = btn.getAttribute('data-audio');
      if (!src && !canSpeak) { btn.hidden = true; return; }
      btn.addEventListener('click', function () {
        if (active && active.btn === btn) {
          if (active.paused) { active.paused = false; active.resume(); }
          else { active.paused = true; active.pause(); }
          return;
        }
        stopActive();
        active = src ? audioPlayer(btn, src) : speechPlayer(btn);
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.note-dialog'), function (dlg) {
      dlg.addEventListener('close', stopActive);
      Array.prototype.forEach.call(dlg.querySelectorAll('[data-close-note]'), function (el) { el.addEventListener('click', stopActive); });
    });
    window.addEventListener('pagehide', function () { stopActive(); if (canSpeak) synth.cancel(); });
  })();

  /* ---------- Share a play: the device share sheet, or copy the link ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-share]'), function (btn) {
    var slug = btn.getAttribute('data-share');
    var title = btn.getAttribute('data-share-title') || document.title;
    var page = /\.html$/.test(location.pathname) ? 'playbook.html' : '/playbook';
    var url = new URL(page + '#' + slug, location.href).href;
    var label = btn.querySelector('.share__label');
    function copied(ok) {
      btn.classList.add('is-copied'); label.textContent = ok ? 'Copied' : 'Copy failed';
      window.setTimeout(function () { btn.classList.remove('is-copied'); label.textContent = 'Share'; }, 1600);
    }
    btn.addEventListener('click', function () {
      if (navigator.share) {
        navigator.share({ title: title, url: url }).catch(function () {});
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { copied(true); }, function () { copied(false); });
      } else {
        window.prompt('Copy this link', url);
      }
    });
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

  var sentPanel = document.getElementById('sent');
  var sentNote = document.getElementById('sent-note');
  var submitBtn = document.getElementById('contact-submit');
  var hp = document.getElementById('f-website');

  /* The draft is the fallback: shown when the site cannot send the inquiry itself. */
  function showDraft(reason) {
    draftText = buildDraft();
    draftBody.textContent = draftText;
    draftStatus.textContent = reason || '';
    form.hidden = true;
    draft.hidden = false;
    formLive.textContent = 'Your draft is ready. Nothing has been sent.';
    draft.focus();
  }
  function showSent() {
    if (sentNote) sentNote.textContent = 'Thanks, ' + fields.name.el.value.trim().split(' ')[0] + '. We read every inquiry and reply within two business days.';
    form.hidden = true;
    if (sentPanel) { sentPanel.hidden = false; sentPanel.focus(); }
    formLive.textContent = 'Your inquiry was sent.';
    form.reset();
  }
  function send() {
    var payload = { name: fields.name.el.value.trim(), email: fields.email.el.value.trim(), company: company.value.trim(), message: fields.message.el.value.trim(), website: hp ? hp.value : '' };
    if (!window.fetch) return Promise.reject(new Error('no fetch'));
    return fetch('contact.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'same-origin' })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j || !j.ok) throw new Error((j && j.reason) || 'failed'); }); });
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = validate();
      if (firstBad) { firstBad.focus(); formLive.textContent = 'Check the highlighted fields.'; return; }
      form.classList.add('is-sending');
      if (submitBtn) submitBtn.setAttribute('aria-busy', 'true');
      formLive.textContent = 'Sending your inquiry.';
      send().then(function () {
        form.classList.remove('is-sending'); if (submitBtn) submitBtn.removeAttribute('aria-busy');
        showSent();
      }, function () {
        form.classList.remove('is-sending'); if (submitBtn) submitBtn.removeAttribute('aria-busy');
        showDraft('We couldn\u2019t send this from the site just now. Copy it and email it to us instead.');
      });
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
