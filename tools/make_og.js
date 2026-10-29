// Makes the 1200x630 link-preview images (WhatsApp, Telegram, Signal…) in assets/img/og/.
// Run once after changing photos: node tools/make_og.js  (needs Playwright + Chromium)
const {chromium} = require('playwright'); const path = require('path'); const fs = require('fs');
const R = path.resolve(__dirname, '..'); const A = p => 'file://' + path.join(R, 'assets/img', p);
const F = process.env.FONTS || '/home/claude/rider/fonts/node_modules/@fontsource';
const pages = {
  index: ['photos/trio-mirror-dome.jpg', '50% 40%'], 'quienes-somos': ['photos/trio-sunset.jpg', '50% 40%'],
  espectaculo: ['photos/live-apolo-dancefloor.jpg', '50% 45%'], musica: ['band-wheelbarrow.jpg', '50% 40%'],
  tienda: ['merch/camiseta-cistema-rosa.jpg', '50% 45%'], talleres: ['vic-aspiradora.jpg', '50% 30%'],
  conciertos: ['photos/live-red-stage.jpg', '50% 40%'], prensa: ['photos/enderrock-orgull-queer.jpg', '50% 40%'],
  contacto: ['photos/trio-veiled-bench.jpg', '50% 40%'],
  letras: ['photos/live-smoke-green.jpg', '50% 40%', 'Letras <i>y</i> traducciones', 'castellano · English · euskara'],
};
const html = ([img, pos, title, sub]) => `<!doctype html><meta charset=utf-8><style>
@font-face{font-family:Anton;src:url(file://${F}/anton/files/anton-latin-400-normal.woff2)}
@font-face{font-family:Mono;font-weight:700;src:url(file://${F}/space-mono/files/space-mono-latin-700-normal.woff2)}
@font-face{font-family:Pf;font-style:italic;src:url(file://${F}/playfair-display/files/playfair-display-latin-700-italic.woff2)}
*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;position:relative;overflow:hidden;background:#0e0b12}
.ph{position:absolute;inset:0;background:url(${A(img)}) ${pos}/cover}
.bar{position:absolute;left:0;right:0;bottom:0;height:12px;background:#ff00ff}
.logo{position:absolute;left:40px;top:36px;background:#0e0b12;padding:16px 22px;border:3px solid #ff00ff}
.logo img{height:74px;display:block}
.t{position:absolute;left:40px;bottom:52px;max-width:1000px}
.t h1{font:400 92px/1 Anton;text-transform:uppercase;color:#0e0b12;background:#ff00ff;display:inline;padding:4px 16px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.t h1 i{font:700 italic 80px Pf;text-transform:none}
.t p{margin-top:16px;display:inline-block;font:700 26px Mono;letter-spacing:.06em;text-transform:uppercase;color:#3cfe2d;background:#0e0b12;padding:8px 14px}
</style><div class=ph></div><div class=logo><img src="${A('logo-pennant-dark.png')}"></div>
${title ? `<div class=t><h1>${title}</h1><br><p>${sub}</p></div>` : ''}<div class=bar></div>`;
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({viewport: {width: 1200, height: 630}});
  for (const [k, v] of Object.entries(pages)) {
    const f = path.join(R, 'assets/img/og', k + '.html'); fs.writeFileSync(f, html(v));
    await pg.goto('file://' + f); await pg.evaluate('document.fonts.ready'); await pg.waitForTimeout(200);
    await pg.screenshot({path: path.join(R, 'assets/img/og', k + '.jpg'), type: 'jpeg', quality: 82}); fs.unlinkSync(f);
  }
  await b.close();
})();
