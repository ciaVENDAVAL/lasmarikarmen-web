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

  /* language button: remember the choice, close on outside click / Escape */
  var langs = document.querySelector('.langs');
  if (langs) {
    langs.addEventListener('click', function (e) {
      var a = e.target.closest('[data-lang]');
      if (a) { try { localStorage.setItem('lm-lang', a.getAttribute('data-lang')); } catch (err) {} }
    });
    document.addEventListener('click', function (e) { if (langs.open && !langs.contains(e.target)) langs.open = false; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && langs.open) { langs.open = false; langs.querySelector('summary').focus(); } });
  }

  /* back to top: shows after scrolling */
  var top = document.querySelector('.to-top');
  if (top) {
    var onScroll = function () { top.hidden = window.scrollY < 500; };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }


  /* hero: muted looping YouTube video over the photo — skipped when motion is reduced or data is saved */
  var hv = document.querySelector('.hero__video');
  function heroVideoAllowed() {
    var rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var save = navigator.connection && navigator.connection.saveData;
    return !rm && !save && !html.classList.contains('a11y-motion');
  }
  function heroVideo() {
    if (!hv) return;
    var on = heroVideoAllowed(), f = hv.querySelector('iframe');
    if (on && !f) {
      var id = hv.getAttribute('data-yt');
      f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&mute=1&loop=1&playlist=' + id +
              '&controls=0&disablekb=1&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1&origin=' +
              encodeURIComponent(location.origin);
      f.allow = 'autoplay; encrypted-media; picture-in-picture';
      f.tabIndex = -1; f.title = '';
      /* show the video only once YouTube reports it is really playing (never show an error screen) */
      var onMsg = function (ev) {
        if (!/youtube/.test(ev.origin)) return;
        try {
          var m = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
          var st = m && m.info && m.info.playerState;
          if (st === 1) hv.classList.add('is-on');
        } catch (x) {}
      };
      window.addEventListener('message', onMsg);
      f.addEventListener('load', function () {
        try { f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); } catch (x) {}
      });
      hv.appendChild(f);
    } else if (!on && f) { hv.classList.remove('is-on'); f.remove(); }
  }
  heroVideo();
  if (window.MutationObserver) new MutationObserver(heroVideo).observe(html, { attributes: true, attributeFilter: ['class'] });

  /* shop: order form drafts an email in the page language */
  var form = document.getElementById('order');
  if (form) {
    var d = function (k) { return form.getAttribute('data-' + k) || ''; };
    var out = form.querySelector('.order__out'), err = form.querySelector('.order__err');
    var draft = document.getElementById('o-draft'), mail = form.querySelector('.order__mail');
    var addr = document.getElementById('o-addr');
    var syncCash = function () {
      var cash = form.querySelector('input[name=pay]:checked').hasAttribute('data-cash');
      addr.closest('label').classList.toggle('is-off', cash);
    };
    form.addEventListener('change', function (e) {
      if (e.target.name === 'pay') syncCash();
      if (e.target.id && /^[qs]-/.test(e.target.id)) {
        var cb = document.getElementById('o-' + e.target.id.slice(2)); if (cb) cb.checked = true;
      }
    });
    syncCash();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var items = [].slice.call(form.querySelectorAll('input[name=item]:checked'));
      var pay = form.querySelector('input[name=pay]:checked');
      var cash = pay.hasAttribute('data-cash');
      var name = document.getElementById('o-name').value.trim();
      var email = document.getElementById('o-email').value.trim();
      var where = addr.value.trim();
      err.hidden = true;
      if (!items.length) { err.textContent = d('need-item'); err.hidden = false; return; }
      if (!name || !/.+@.+\..+/.test(email) || (!cash && !where)) { err.textContent = d('need-fields'); err.hidden = false; return; }
      var lines = items.map(function (cb) {
        var id = cb.value, q = document.getElementById('q-' + id), s = document.getElementById('s-' + id);
        var n = Math.max(1, parseInt(q && q.value, 10) || 1);
        return '- ' + n + ' × ' + cb.getAttribute('data-name') + (s ? ' (' + d('size') + ' ' + s.value + ')' : '') + ' · ' + cb.getAttribute('data-price') + ' €';
      });
      var body = [d('hello'), '', d('want'), lines.join('\n'), '',
        cash ? d('pickup') : d('ship') + '\n' + name + '\n' + where, '',
        d('pay') + ' ' + pay.value, '', d('amount'), '', name, email].join('\n');
      draft.value = body;
      var href = 'mailto:' + d('to') + '?subject=' + encodeURIComponent(d('subject') + ' · ' + name) + '&body=' + encodeURIComponent(body);
      mail.setAttribute('href', href);
      out.hidden = false;
      window.location.href = href;
    });
    form.querySelector('.order__copy').addEventListener('click', function () {
      var b = this, done = function () { b.textContent = d('copied'); };
      draft.select();
      if (navigator.clipboard) navigator.clipboard.writeText(draft.value).then(done, function () { try { document.execCommand('copy'); done(); } catch (x) {} });
      else { try { document.execCommand('copy'); done(); } catch (x) {} }
    });
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
