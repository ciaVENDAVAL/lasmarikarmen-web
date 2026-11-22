/* Fuego Marikarmen — hidden toy on every page (except /blob/).
   Long-press anywhere (~0.4 s): a colourful fireball starts brewing under the finger.
   Flick while holding: it's thrown across the screen and dissolves.
   Keep holding 3 more seconds: the screen turns into a full-screen fluid game;
   stop playing for 2 seconds (or press Esc) and it dissolves back into the page.
   Off when motion is reduced (system setting or the ⏸️ button in the accessibility panel) and in #edit mode.
   Fluid solver after Pavel Dobryakov's WebGL Fluid Simulation (MIT, github.com/PavelDoGreat/WebGL-Fluid-Simulation). */
(function () {
  'use strict';
  var html = document.documentElement, body = document.body;
  if (!body || body.classList.contains('page-blob')) return;
  function off() {
    var rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return rm || html.classList.contains('a11y-motion') || html.classList.contains('is-editing');
  }

  var HOLD_MS = 420, GAME_MS = 3000, IDLE_MS = 2000, SLOP = 10, FLICK = 0.55; // px/ms
  var BRAND = [300, 112, 330, 190, 45, 270];                                   // hues: magenta, neon green, pink, cyan, gold, violet

  /* ---------- styles ---------- */
  var st = document.createElement('style');
  st.textContent =
    '.fluid-fx{position:fixed;inset:0;width:100%;height:100%;z-index:9999;pointer-events:none;display:none;' +
    'background:rgb(14 11 18 / 0);transition:background-color 1.1s ease,opacity 1.4s ease;touch-action:none}' +
    '.fluid-fx.is-on{display:block}.fluid-fx.is-game{pointer-events:auto;background:rgb(14 11 18 / .96);cursor:crosshair}' +
    'html.fluid-hold,html.fluid-hold *{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}' +
    'html.fluid-game{overflow:hidden}';
  document.head.appendChild(st);

  var cv = document.createElement('canvas');
  cv.className = 'fluid-fx';
  cv.setAttribute('aria-hidden', 'true');
  body.appendChild(cv);

  /* ---------- WebGL fluid ---------- */
  var gl, ext, P = {}, quad, vel, dye, divg, curlT, pres, simW, simH, ready = false, failed = false;
  var VS = 'precision highp float;attribute vec2 aPosition;varying vec2 vUv,vL,vR,vT,vB;uniform vec2 texelSize;' +
    'void main(){vUv=aPosition*.5+.5;vL=vUv-vec2(texelSize.x,0.);vR=vUv+vec2(texelSize.x,0.);vT=vUv+vec2(0.,texelSize.y);vB=vUv-vec2(0.,texelSize.y);gl_Position=vec4(aPosition,0.,1.);}';
  var H = 'precision mediump float;precision mediump sampler2D;varying highp vec2 vUv,vL,vR,vT,vB;';
  var FS = {
    clear: H + 'uniform sampler2D uTexture;uniform float value;void main(){gl_FragColor=value*texture2D(uTexture,vUv);}',
    display: H + 'uniform sampler2D uTexture;void main(){vec3 c=max(texture2D(uTexture,vUv).rgb,0.);float m=max(c.r,max(c.g,c.b));' +
      'vec3 hue=c/max(m,.0001);hue=mix(hue,vec3(1.),smoothstep(1.2,3.,m));float a=clamp(smoothstep(0.,.9,m)*1.1,0.,1.);gl_FragColor=vec4(hue*a,a);}',
    splat: H + 'uniform sampler2D uTarget;uniform float aspectRatio,radius;uniform vec3 color;uniform vec2 point;' +
      'void main(){vec2 p=vUv-point;p.x*=aspectRatio;vec3 s=exp(-dot(p,p)/radius)*color;gl_FragColor=vec4(texture2D(uTarget,vUv).xyz+s,1.);}',
    advection: H + 'uniform sampler2D uVelocity,uSource;uniform highp vec2 texelSize;uniform float dt,dissipation;' +
      'void main(){vec2 c=vUv-dt*texture2D(uVelocity,vUv).xy*texelSize;gl_FragColor=texture2D(uSource,c)/(1.+dissipation*dt);}',
    divergence: H + 'uniform sampler2D uVelocity;void main(){float L=texture2D(uVelocity,vL).x,R=texture2D(uVelocity,vR).x,T=texture2D(uVelocity,vT).y,B=texture2D(uVelocity,vB).y;' +
      'vec2 C=texture2D(uVelocity,vUv).xy;if(vL.x<0.)L=-C.x;if(vR.x>1.)R=-C.x;if(vT.y>1.)T=-C.y;if(vB.y<0.)B=-C.y;gl_FragColor=vec4(.5*(R-L+T-B),0.,0.,1.);}',
    curl: H + 'uniform sampler2D uVelocity;void main(){float L=texture2D(uVelocity,vL).y,R=texture2D(uVelocity,vR).y,T=texture2D(uVelocity,vT).x,B=texture2D(uVelocity,vB).x;' +
      'gl_FragColor=vec4(.5*(R-L-T+B),0.,0.,1.);}',
    vorticity: H + 'uniform sampler2D uVelocity,uCurl;uniform float curl,dt;void main(){float L=texture2D(uCurl,vL).x,R=texture2D(uCurl,vR).x,T=texture2D(uCurl,vT).x,B=texture2D(uCurl,vB).x,C=texture2D(uCurl,vUv).x;' +
      'vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L));f/=length(f)+.0001;f*=curl*C;f.y*=-1.;vec2 v=texture2D(uVelocity,vUv).xy+f*dt;gl_FragColor=vec4(clamp(v,-1000.,1000.),0.,1.);}',
    pressure: H + 'uniform sampler2D uPressure,uDivergence;void main(){float L=texture2D(uPressure,vL).x,R=texture2D(uPressure,vR).x,T=texture2D(uPressure,vT).x,B=texture2D(uPressure,vB).x;' +
      'gl_FragColor=vec4((L+R+B+T-texture2D(uDivergence,vUv).x)*.25,0.,0.,1.);}',
    gradient: H + 'uniform sampler2D uPressure,uVelocity;void main(){float L=texture2D(uPressure,vL).x,R=texture2D(uPressure,vR).x,T=texture2D(uPressure,vT).x,B=texture2D(uPressure,vB).x;' +
      'vec2 v=texture2D(uVelocity,vUv).xy-vec2(R-L,T-B);gl_FragColor=vec4(v,0.,1.);}'
  };

  function init() {
    if (ready || failed) return ready;
    try {
      var opts = { alpha: true, depth: false, stencil: false, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false };
      gl = cv.getContext('webgl2', opts);
      var gl2 = !!gl;
      if (!gl) gl = cv.getContext('webgl', opts) || cv.getContext('experimental-webgl', opts);
      if (!gl) throw 'no webgl';
      var half, linear;
      if (gl2) { gl.getExtension('EXT_color_buffer_float'); linear = true; half = gl.HALF_FLOAT; }
      else { var hf = gl.getExtension('OES_texture_half_float'); if (!hf) throw 'no half float'; half = hf.HALF_FLOAT_OES; linear = !!gl.getExtension('OES_texture_half_float_linear'); }
      var fmt = function (i, f) {
        if (!gl2) return testFmt(gl.RGBA, gl.RGBA, half) ? { i: gl.RGBA, f: gl.RGBA } : null;
        if (testFmt(i, f, half)) return { i: i, f: f };
        if (i === gl.R16F) return fmt(gl.RG16F, gl.RG);
        if (i === gl.RG16F) return fmt(gl.RGBA16F, gl.RGBA);
        return null;
      };
      ext = { half: half, filter: linear ? gl.LINEAR : gl.NEAREST,
        rgba: fmt(gl2 ? gl.RGBA16F : gl.RGBA, gl.RGBA), rg: fmt(gl2 ? gl.RG16F : gl.RGBA, gl2 ? gl.RG : gl.RGBA), r: fmt(gl2 ? gl.R16F : gl.RGBA, gl2 ? gl.RED : gl.RGBA) };
      if (!ext.rgba || !ext.rg || !ext.r) throw 'no render format';

      var vs = compile(gl.VERTEX_SHADER, VS);
      for (var k in FS) P[k] = program(vs, FS[k]);
      quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
      var ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(0);
      resize(true);
      ready = true;
    } catch (e) { failed = true; if (window.console) console.info('fluid off:', e); }
    return ready;
  }
  function testFmt(i, f, t) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, i, 4, 4, 0, f, t, null);
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.deleteFramebuffer(fb); gl.deleteTexture(tex);
    return ok;
  }
  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s);
    return s;
  }
  function program(vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPosition');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw gl.getProgramInfoLog(p);
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    return { p: p, u: u };
  }
  function use(pr) { gl.useProgram(pr.p); return pr.u; }
  function fbo(w, h, f, filter) {
    gl.activeTexture(gl.TEXTURE0);
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, f.i, w, h, 0, f.f, ext.half, null);
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex: tex, fb: fb, w: w, h: h, tx: 1 / w, ty: 1 / h,
      attach: function (id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, tex); return id; } };
  }
  function dbl(w, h, f, filter) {
    var a = fbo(w, h, f, filter), b = fbo(w, h, f, filter);
    return { w: w, h: h, tx: 1 / w, ty: 1 / h, read: a, write: b, swap: function () { var t = this.read; this.read = this.write; this.write = t; } };
  }
  function res(r) {
    var w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, a = w / h; if (a < 1) a = 1 / a;
    var lo = Math.round(r), hi = Math.round(r * a);
    return w > h ? { w: hi, h: lo } : { w: lo, h: hi };
  }
  function resize(force) {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
    if (!force && cv.width === w && cv.height === h) return;
    cv.width = w; cv.height = h;
    var small = Math.min(innerWidth, innerHeight) < 600;
    var s = res(small ? 96 : 128), d = res(small ? 512 : 1024);
    simW = s.w; simH = s.h;
    vel = dbl(s.w, s.h, ext.rg, ext.filter);
    dye = dbl(d.w, d.h, ext.rgba, ext.filter);
    divg = fbo(s.w, s.h, ext.r, gl.NEAREST);
    curlT = fbo(s.w, s.h, ext.r, gl.NEAREST);
    pres = dbl(s.w, s.h, ext.r, gl.NEAREST);
  }
  function blit(t) {
    if (t) { gl.viewport(0, 0, t.w, t.h); gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); }
    else { gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  var DIS = { dye: 1, vel: 0.2 };
  function step(dt) {
    gl.disable(gl.BLEND);
    var u = use(P.curl); gl.uniform2f(u.texelSize, vel.tx, vel.ty); gl.uniform1i(u.uVelocity, vel.read.attach(0)); blit(curlT);
    u = use(P.vorticity); gl.uniform2f(u.texelSize, vel.tx, vel.ty); gl.uniform1i(u.uVelocity, vel.read.attach(0)); gl.uniform1i(u.uCurl, curlT.attach(1));
    gl.uniform1f(u.curl, 28); gl.uniform1f(u.dt, dt); blit(vel.write); vel.swap();
    u = use(P.divergence); gl.uniform2f(u.texelSize, vel.tx, vel.ty); gl.uniform1i(u.uVelocity, vel.read.attach(0)); blit(divg);
    u = use(P.clear); gl.uniform1i(u.uTexture, pres.read.attach(0)); gl.uniform1f(u.value, 0.8); blit(pres.write); pres.swap();
    u = use(P.pressure); gl.uniform2f(u.texelSize, vel.tx, vel.ty); gl.uniform1i(u.uDivergence, divg.attach(0));
    for (var i = 0; i < 20; i++) { gl.uniform1i(u.uPressure, pres.read.attach(1)); blit(pres.write); pres.swap(); }
    u = use(P.gradient); gl.uniform2f(u.texelSize, vel.tx, vel.ty); gl.uniform1i(u.uPressure, pres.read.attach(0)); gl.uniform1i(u.uVelocity, vel.read.attach(1)); blit(vel.write); vel.swap();
    u = use(P.advection); gl.uniform2f(u.texelSize, vel.tx, vel.ty);
    var vid = vel.read.attach(0); gl.uniform1i(u.uVelocity, vid); gl.uniform1i(u.uSource, vid);
    gl.uniform1f(u.dt, dt); gl.uniform1f(u.dissipation, DIS.vel); blit(vel.write); vel.swap();
    gl.uniform1i(u.uVelocity, vel.read.attach(0)); gl.uniform1i(u.uSource, dye.read.attach(1));
    gl.uniform1f(u.dissipation, DIS.dye); blit(dye.write); dye.swap();
  }
  function render() {
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.clear(gl.COLOR_BUFFER_BIT);
    var u = use(P.display); gl.uniform1i(u.uTexture, dye.read.attach(0)); blit(null);
  }
  function splat(x, y, dx, dy, c, r) {                          // x,y in 0..1 (y up); dx,dy velocity; c colour [r,g,b]; r radius factor
    var asp = cv.width / cv.height, rad = (r || 0.25) / 100; if (asp > 1) rad *= asp;
    var u = use(P.splat);
    gl.uniform1i(u.uTarget, vel.read.attach(0)); gl.uniform1f(u.aspectRatio, asp); gl.uniform2f(u.point, x, y);
    gl.uniform3f(u.color, dx, dy, 0); gl.uniform1f(u.radius, rad); blit(vel.write); vel.swap();
    gl.uniform1i(u.uTarget, dye.read.attach(0)); gl.uniform3f(u.color, c[0], c[1], c[2]); blit(dye.write); dye.swap();
  }
  function wipe() {
    var u = use(P.clear); gl.uniform1f(u.value, 0);
    [vel, dye, pres].forEach(function (d) { gl.uniform1i(u.uTexture, d.read.attach(0)); blit(d.write); d.swap(); });
  }
  function hsv(h, s, v, k) {                                    // hue in degrees → [r,g,b] * k
    h = ((h % 360) + 360) % 360 / 60;
    var i = Math.floor(h), f = h - i, p = v * (1 - s), q = v * (1 - s * f), t = v * (1 - s * (1 - f));
    var c = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6];
    return [c[0] * k, c[1] * k, c[2] * k];
  }

  /* ---------- the toy ---------- */
  var mode = 'idle', raf = 0, last = 0, fadeAt = 0, hideT = 0;
  var hold = null;           // pending long-press {id,x,y,t,timer}
  var brew = null;           // {id,x,y,t0,a,hue,hist:[]}
  var balls = [];            // flying fireballs
  var ptrs = {};             // game pointers
  var lastPlay = 0, suppressClick = 0, hueBase = Math.random() * 360;

  function uv(x, y) { return [x / innerWidth, 1 - y / innerHeight]; }
  function show() {
    clearTimeout(hideT);
    if (!cv.classList.contains('is-on')) { cv.style.opacity = '1'; cv.classList.add('is-on'); resize(); wipe(); }
    cv.style.opacity = '1';
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }
  function startFade() {
    mode = 'fade'; fadeAt = performance.now(); DIS.dye = 1.6; DIS.vel = 0.6;
  }
  function stopAll() {
    mode = 'idle'; cancelAnimationFrame(raf); raf = 0; balls = [];
    cv.classList.remove('is-on', 'is-game'); html.classList.remove('fluid-game', 'fluid-hold');
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    if (!dt) return;
    resize();

    if (mode === 'brew' && brew) {                           // swirling orb under the finger
      var age = (now - brew.t0) / GAME_MS, p = uv(brew.x, brew.y), asp = cv.width / cv.height;
      brew.a += dt * (7 + age * 9);
      var orbit = 0.018 + age * 0.03, spin = 260 + age * 700, k = (0.03 + age * 0.05) * dt * 60;
      for (var j = 0; j < 3; j++) {
        var an = brew.a + j * 2.094, ox = Math.cos(an) * orbit / asp, oy = Math.sin(an) * orbit;
        splat(p[0] + ox, p[1] + oy, -Math.sin(an) * spin, Math.cos(an) * spin,
          hsv(brew.hue + j * 18 + Math.sin(now / 260 + j) * 22, 0.95, 1, k), 0.05 + age * 0.12);
      }
      if (now - brew.t0 > GAME_MS) startGame();
    }

    for (var b = balls.length - 1; b >= 0; b--) {          // flying fireballs leave a burning trail
      var f = balls[b], life = (now - f.t0) / 1000;
      f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.985; f.vy *= 0.985;
      var q = uv(f.x, f.y), sz = Math.max(0.05, f.r * (1 - life * 0.9));
      splat(q[0], q[1], f.vx / innerWidth * 40, -f.vy / innerHeight * 40, hsv(f.hue + Math.sin(life * 9) * 25, 0.95, 1, 0.35 * (1 - life * 0.8) * dt * 60), sz);
      if (life > 1.1 || f.x < -200 || f.y < -200 || f.x > innerWidth + 200 || f.y > innerHeight + 200) balls.splice(b, 1);
    }

    if (mode === 'game' && now - lastPlay > IDLE_MS && !Object.keys(ptrs).length) endGame();
    if (mode === 'fade' && !balls.length && now - fadeAt > 1800) {
      cv.style.opacity = '0';
      if (now - fadeAt > 3200) { stopAll(); return; }
    }
    step(dt);
    render();
  }

  function startBrew(h) {
    if (!init()) return;
    mode = 'brew'; DIS.dye = 0.9; DIS.vel = 0.35;
    brew = { id: h.id, x: h.x, y: h.y, t0: performance.now(), a: 0, hue: hueBase, hist: [[h.x, h.y, performance.now()]] };
    hueBase = BRAND[(BRAND.indexOf(hueBase) + 1) % BRAND.length] || BRAND[0];
    html.classList.add('fluid-hold');
    show();
    if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {}
  }
  function release(ev) {
    var b = brew; brew = null; suppressClick = performance.now();
    html.classList.remove('fluid-hold');
    var hs = b.hist, now = performance.now(), i = hs.length - 1;
    while (i > 0 && now - hs[i - 1][2] < 90) i--;
    var dtm = Math.max(now - hs[i][2], 16), vx = (b.x - hs[i][0]) / dtm, vy = (b.y - hs[i][1]) / dtm, sp = Math.hypot(vx, vy);
    if (sp > FLICK && mode === 'brew') {                    // thrown!
      var m = Math.min(sp, 6) / sp * 1000 * 1.25;           // px per second
      var p = uv(b.x, b.y);
      splat(p[0], p[1], vx * m / innerWidth * 45, -vy * m / innerHeight * 45, hsv(b.hue, 0.95, 1, 0.9), 0.25);
      balls.push({ x: b.x, y: b.y, vx: vx * m, vy: vy * m, t0: now, hue: b.hue, r: 0.3 });
    }
    startFade();
  }
  function startGame() {
    brew && (ptrs[brew.id] = { x: brew.x, y: brew.y, hue: brew.hue });
    var b = brew; brew = null;
    mode = 'game'; DIS.dye = 0.9; DIS.vel = 0.2; lastPlay = performance.now();
    html.classList.remove('fluid-hold'); html.classList.add('fluid-game');
    cv.classList.add('is-game');
    if (navigator.vibrate) try { navigator.vibrate([20, 40, 30]); } catch (e) {}
    var p = uv(b.x, b.y);
    for (var i = 0; i < 14; i++) {                         // the orb bursts open
      var a = i / 14 * Math.PI * 2;
      splat(p[0], p[1], Math.cos(a) * 1600, Math.sin(a) * 1600, hsv(BRAND[i % BRAND.length], 0.95, 1, 1), 0.22);
    }
  }
  function endGame() {
    ptrs = {}; suppressClick = performance.now();
    cv.classList.remove('is-game'); html.classList.remove('fluid-game');
    startFade();
  }
  function cancelHold() { if (hold) { clearTimeout(hold.timer); hold = null; html.classList.remove('fluid-hold'); } }

  var SKIP = 'input,textarea,select,option,[contenteditable],video,audio,iframe,canvas,.fluid-off,.a11y-panel,[role="slider"]';
  addEventListener('pointerdown', function (e) {
    if (mode === 'game') {
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY, hue: BRAND[Math.floor(Math.random() * BRAND.length)] };
      var p = uv(e.clientX, e.clientY);
      splat(p[0], p[1], (Math.random() - 0.5) * 900, (Math.random() - 0.5) * 900, hsv(ptrs[e.pointerId].hue, 0.9, 1, 0.8), 0.3);
      lastPlay = performance.now();
      return;
    }
    if (hold || brew) { cancelHold(); return; }              // a second finger (pinch) cancels
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0) || off()) return;
    if (e.target.closest && e.target.closest(SKIP)) return;
    var h = { id: e.pointerId, x: e.clientX, y: e.clientY };
    h.timer = setTimeout(function () { if (hold === h) { hold = null; startBrew(h); } }, HOLD_MS);
    hold = h;
    if (e.pointerType !== 'mouse') html.classList.add('fluid-hold'); // no text selection / callout while waiting
  }, true);

  addEventListener('pointermove', function (e) {
    if (hold && e.pointerId === hold.id && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > SLOP) cancelHold();
    if (brew && e.pointerId === brew.id) {
      brew.x = e.clientX; brew.y = e.clientY;
      brew.hist.push([e.clientX, e.clientY, performance.now()]); if (brew.hist.length > 12) brew.hist.shift();
    }
    if (mode === 'game') {
      var q = ptrs[e.pointerId];
      if (q || e.pointerType === 'mouse' && e.buttons) {
        if (!q) q = ptrs[e.pointerId] = { x: e.clientX, y: e.clientY, hue: BRAND[Math.floor(Math.random() * BRAND.length)] };
        var dx = e.clientX - q.x, dy = e.clientY - q.y;
        if (dx || dy) {
          var p = uv(e.clientX, e.clientY);
          q.hue += 0.6;
          splat(p[0], p[1], dx / innerWidth * 6000, -dy / innerHeight * 6000, hsv(q.hue, 0.95, 1, 0.3), 0.25);
          lastPlay = performance.now();
        }
        q.x = e.clientX; q.y = e.clientY;
      }
    }
  }, true);

  function up(e) {
    if (hold && e.pointerId === hold.id) cancelHold();
    if (brew && e.pointerId === brew.id) { if (e.type === 'pointercancel') { brew = null; html.classList.remove('fluid-hold'); startFade(); } else release(e); }
    if (ptrs[e.pointerId]) { delete ptrs[e.pointerId]; lastPlay = performance.now(); }
  }
  addEventListener('pointerup', up, true);
  addEventListener('pointercancel', up, true);

  // keep the page still while brewing or playing, and swallow the click / context menu a long-press would cause
  addEventListener('touchmove', function (e) { if (brew || mode === 'game') e.preventDefault(); }, { passive: false, capture: true });
  addEventListener('contextmenu', function (e) { if (hold || brew || mode === 'game' || performance.now() - suppressClick < 600) e.preventDefault(); }, true);
  addEventListener('click', function (e) {
    if (mode === 'game' || performance.now() - suppressClick < 450) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && mode === 'game') endGame(); });
  addEventListener('blur', function () { cancelHold(); if (brew) { brew = null; startFade(); } if (mode === 'game') { ptrs = {}; endGame(); } });
  document.addEventListener('visibilitychange', function () { if (document.hidden && raf) { cancelHold(); brew = null; ptrs = {}; stopAll(); } });
})();
