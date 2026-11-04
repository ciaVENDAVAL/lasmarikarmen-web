/* Lyrics page: songs with per-verse translation buttons (EN / ES / EU), index and click-to-load videos.
   Data comes from <script id="ly-data"> (built from letras/), UI texts from <script id="ly-ui">. */
(function () {
  var SONGS = JSON.parse(document.getElementById('ly-data').textContent);
  var UI = JSON.parse(document.getElementById('ly-ui').textContent);
  var LC = { es: 'ES', en: 'EN', eu: 'EU', ru: 'RU', gl: 'GL', ca: 'CA', other: '··' };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var G = 'orig', showO = false, BM = {};

  function avail(b) { var a = {}; ['en', 'es', 'eu'].forEach(function (t) { a[t] = b.segs.some(function (s) { return !s.skip && !s.keep && s.lang !== t && s[t]; }); }); return a; }
  function modeOf(si, bi) { return BM[si + ':' + bi] || G; }

  function lineHTML(l) {
    var t = l.text;
    if (l.cls === 'cr') return '<p class="ly-ln ly-cr">' + esc(t) + '</p>';
    if (!t.trim()) return '<p class="ly-ln ly-sp"></p>';
    if (/^\[[^\]]+\]$/.test(t.trim())) return '<p class="ly-ln ly-sg">' + esc(t) + '</p>';
    var m = t.match(/^(\[[^\]]+\])\s*(.*)$/);
    var h = m ? '<span class="ly-tg">' + esc(m[1]) + '</span> ' + esc(m[2]) : esc(t);
    if (l.o && showO) h += '<span class="ly-o">' + esc(l.o) + '</span>';
    return '<p class="ly-ln' + (l.tr ? ' ly-tr' : '') + '">' + h + '</p>';
  }

  function stanzaHTML(si, bi) {
    var b = SONGS[si].blocks[bi], m = modeOf(si, bi), av = avail(b), lines = [];
    b.segs.forEach(function (s) {
      s.o.forEach(function (o, i) {
        if (s.skip) { lines.push({ text: o, cls: 'cr' }); return; }
        var T = (m !== 'orig' && m !== s.lang && !s.keep && s[m]) ? s[m][i] : null;
        lines.push(T !== null && T !== undefined ? { text: T, tr: true, o: o } : { text: o });
      });
    });
    var langs = [];
    b.segs.forEach(function (s) { if (!s.skip && langs.indexOf(s.lang) < 0) langs.push(s.lang); });
    var opts = ['en', 'es', 'eu'].filter(function (t) { return av[t]; }), tools = '';
    if (opts.length) {
      tools = '<div class="ly-tools"><span class="ly-lg">' + langs.map(function (l) { return LC[l] || l; }).join('·') + ' →</span>' +
        ['orig'].concat(opts).map(function (t) {
          return '<button class="ly-mini" type="button" data-s="' + si + ':' + bi + '" data-m="' + t + '" aria-pressed="' + (m === t) + '">' + (t === 'orig' ? esc(UI.original) : LC[t]) + '</button>';
        }).join('') + '</div>';
    }
    return '<section class="ly-stanza' + (b.after ? ' ly-after' : '') + '">' + tools + '<div>' + lines.map(lineHTML).join('') + '</div></section>';
  }

  function descHTML(si) {
    var s = SONGS[si], d = s.desc || {}, h = '';
    if (d.text && d.text.length) h += '<p class="label">' + esc(UI.desc) + '</p>' + d.text.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    if (d.credits && d.credits.length) h += '<dl class="ly-cred">' + d.credits.map(function (c) {
      return '<dt>' + esc(c[0]) + '</dt><dd>' + (c[2] ? '<a href="' + esc(c[2]) + '" target="_blank" rel="noopener">' + esc(c[1]) + '</a>' : esc(c[1])) + '</dd>';
    }).join('') + '</dl>';
    if (d.video) {
      var id = d.video;
      h += '<div class="ly-video"><button class="ly-vbtn" type="button" data-v="' + id + '" style="background-image:url(https://i.ytimg.com/vi/' + id + '/hqdefault.jpg)" aria-label="' + esc(UI.watch_here + ' · ' + s.title) + '"><span>▶ ' + esc(UI.watch_here) + '</span></button>' +
        '<p class="ly-links"><a class="more" href="https://www.youtube.com/watch?v=' + id + '" target="_blank" rel="noopener">' + esc(UI.watch_yt) + ' ↗</a>' +
        (d.links || []).map(function (l) { return '<a class="more" href="' + esc(l[1]) + '" target="_blank" rel="noopener">' + esc(l[0]) + ' ↗</a>'; }).join('') + '</p>' +
        '<p class="ly-note">' + esc(UI.cc) + '</p></div>';
    }
    if (d.src && d.src.length) h += '<p class="ly-src"><span>' + esc(UI.more) + ':</span> ' + d.src.map(function (x) {
      var ext = /^https?:/.test(x[1]);
      return '<a href="' + esc(x[1]) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(x[0]) + (ext ? ' ↗' : '') + '</a>';
    }).join(' · ') + '</p>';
    return h ? '<aside class="ly-desc">' + h + '</aside>' : '';
  }

  function songHTML(si) {
    var s = SONGS[si], langs = [];
    s.blocks.forEach(function (b) { (b.segs || []).forEach(function (g) { if (!g.skip && langs.indexOf(g.lang) < 0) langs.push(g.lang); }); });
    var tags = langs.map(function (l) { return '<span class="ly-tag">' + (LC[l] || l) + '</span>'; }).join('') + (s.desc && s.desc.video ? '<span class="ly-tag ly-tag--v">▶ ' + esc(UI.video) + '</span>' : '');
    return '<article class="ly-song" id="' + s.slug + '"><h2 class="ly-title">' + esc(s.title) + '</h2><div class="ly-meta">' + tags + '</div>' +
      '<div class="ly-body"><div class="ly-text">' +
      s.blocks.map(function (b, bi) { return b.hr ? '<hr class="ly-hr">' : '<div data-b="' + si + ':' + bi + '">' + stanzaHTML(si, bi) + '</div>'; }).join('') +
      '</div>' + descHTML(si) + '</div>' +
      '<a class="ly-up mono" href="#ly-index">↑ ' + esc(UI.index) + '</a></article>';
  }

  function renderAll() { $('#ly-songs').innerHTML = SONGS.map(function (_, i) { return songHTML(i); }).join(''); }
  function rerenderBlock(si, bi) { $('[data-b="' + si + ':' + bi + '"]').innerHTML = stanzaHTML(si, bi); }

  function buildToc() {
    var li = SONGS.map(function (s) {
      return '<li data-t="' + esc(s.title.toLowerCase()) + '"><a href="#' + s.slug + '">' + esc(s.title) + (s.desc && s.desc.video ? '<span class="ly-pl" aria-hidden="true">▶</span>' : '') + '</a></li>';
    }).join('');
    $('#ly-tocL').innerHTML = li; $('#ly-tocM').innerHTML = li;
    $$('.ly-cnt').forEach(function (e) { e.textContent = SONGS.length; });
    $('#ly-flt').addEventListener('input', function (e) {
      var v = e.target.value.toLowerCase().trim();
      $$('#ly-tocL li').forEach(function (x) { x.hidden = v && x.getAttribute('data-t').indexOf(v) < 0; });
    });
    $('#ly-tocM').addEventListener('click', function (e) { if (e.target.closest('a')) $('.ly-tocm').open = false; });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting) $$('.ly-toc a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id); });
        });
      }, { rootMargin: '-25% 0px -65% 0px' });
      $$('.ly-song').forEach(function (a) { io.observe(a); });
    }
  }

  // keep the toolbar right under the site header
  function setTop() {
    var h = $('.top'); if (h) document.documentElement.style.setProperty('--ly-top', h.offsetHeight + 'px');
  }
  window.addEventListener('resize', setTop); setTop();

  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-g]');
    if (g) {
      G = g.getAttribute('data-g'); BM = {};
      $$('[data-g]').forEach(function (b) { b.setAttribute('aria-pressed', b === g); });
      renderAll(); return;
    }
    var m = e.target.closest('[data-m]');
    if (m) { var p = m.getAttribute('data-s').split(':'); BM[p[0] + ':' + p[1]] = m.getAttribute('data-m'); rerenderBlock(+p[0], +p[1]); return; }
    if (e.target.closest('.ly-up')) { var d = $('.ly-tocm'); if (d && d.offsetParent !== null) d.open = true; return; }
    var v = e.target.closest('[data-v]');
    if (v) {
      var f = document.createElement('iframe'), hl = UI.lang === 'eu' ? 'eu' : UI.lang;
      f.src = 'https://www.youtube-nocookie.com/embed/' + v.getAttribute('data-v') + '?autoplay=1&cc_load_policy=1&cc_lang_pref=' + hl + '&hl=' + hl + '&rel=0';
      f.title = UI.watch_here; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.referrerPolicy = 'strict-origin-when-cross-origin'; f.allowFullscreen = true;
      v.replaceWith(f);
    }
  });
  $('#ly-orig').addEventListener('click', function (e) {
    showO = !showO; e.currentTarget.setAttribute('aria-pressed', showO); renderAll();
  });

  renderAll(); buildToc();
})();
