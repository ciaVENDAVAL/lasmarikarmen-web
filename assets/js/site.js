/* Las Marikarmen — menu, accessibility panel, back-to-top, click-to-load players */
(function () {
  var html = document.documentElement;
  html.classList.add('js');

  /* mobile menu */
  var mb = document.querySelector('.menu-btn'), nav = document.getElementById('nav');
  if (mb && nav) {
    mb.addEventListener('click', function () {
      var open = mb.getAttribute('aria-expanded') === 'true';
      mb.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('open', !open);
    });
  }

  /* accessibility panel (settings kept in this browser only) */
  var KEY = 'lm-a11y', TOGGLES = ['motion', 'contrast', 'plain', 'links', 'spacing'];
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { state = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function apply() {
    TOGGLES.forEach(function (k) { html.classList.toggle('a11y-' + k, !!state[k]); });
    html.style.fontSize = state.size ? state.size + '%' : '';
    document.querySelectorAll('.a11y-panel [data-a]').forEach(function (b) {
      var k = b.getAttribute('data-a');
      if (TOGGLES.indexOf(k) > -1) b.setAttribute('aria-pressed', String(!!state[k]));
    });
  }
  var btn = document.querySelector('.a11y-btn'), panel = document.getElementById('a11y-panel');
  if (btn && panel) {
    function close() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      panel.hidden = open; btn.setAttribute('aria-expanded', String(!open));
      if (!open) { var f = panel.querySelector('button'); if (f) f.focus(); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { close(); btn.focus(); } });
    document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) close(); });
    panel.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var k = b.getAttribute('data-a'), size = state.size || 100;
      if (k === 'bigger') state.size = Math.min(size + 10, 160);
      else if (k === 'smaller') state.size = Math.max(size - 10, 80);
      else if (k === 'reset') state = {};
      else state[k] = !state[k];
      if (state.size === 100) delete state.size;
      save(); apply();
    });
    apply();
  }

  /* back to top: shows after scrolling */
  var top = document.querySelector('.to-top');
  if (top) {
    var onScroll = function () { top.hidden = window.scrollY < 500; };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* players load only when asked (no third-party cookies before that) */
  document.querySelectorAll('[data-embed]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      var f = document.createElement('iframe');
      f.src = el.getAttribute('data-embed');
      f.title = el.getAttribute('data-title') || '';
      f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      f.allowFullscreen = true; f.loading = 'lazy';
      f.className = el.getAttribute('data-kind') === 'spotify' ? 'embed embed--spotify' : 'embed';
      el.replaceWith(f);
    });
  });
})();
