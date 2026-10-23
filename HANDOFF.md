# Las Marikarmen — web content handoff (texts + photos)

For any conversation that wants to reuse the texts and photos of the new Las Marikarmen website
(press kit PDFs, posters, dossiers, social posts, other translations…).
Last updated: 2026-10-24.

## Where everything is

The website preview artifact holds all texts and all photos as files:
**https://claude.ai/artifact/46Y4KUjLop6rgPDjkpiL5R**

Fetch a file with the Artifact tool: `action: "read"`, `url` = the link above, `path` = the path below
(several at once with `paths`). Example: `path: "content/text.yaml"`.

| What | Path in the artifact |
|---|---|
| All web texts, 10 languages side by side | `content/text.yaml` (also in this project as `claude/web-text.yaml`) |
| Names, pronoun keys, links, socials, merch, videos, press list, concerts, credits | `content/site.yaml` (also in this project as `claude/web-site.yaml`) |
| Press kit PDF (castellano, 2026-10) | `assets/presskit/Las-Marikarmen-presskit-2026-es.pdf` |
| Photos used on the web | `assets/img/…` and `assets/img/photos/…` (list below) |
| Good photos not used on the web yet | `photo-archive/…` (list below) |
| Merch product images | `assets/img/merch/…` |
| Music-video thumbnails (1280×720 from YouTube, resized to 960) | `assets/img/video/<youtube-id>.jpg` |

Higher-resolution originals of the first photo batch are in this project's files
(e.g. `contamina 3A0A4355.jpg`, `hipogrifa 3A0A4487.jpg`, `Las Marikarmen 2.jpg`). The web copies are resized.

## How text.yaml works

Each key has one line per language: `es` (source), `en`, `ca`, `gl`, `eu`, `pt`, `fr`, `it`, `de`, `ja`.
Values may contain `<b>`, `<em>`, `<br>` and `&amp;` — strip or convert them for print.
Translations other than castellano are drafts that still need native proofreading
(especially euskara, japonés and the playful lines: mottos, member bios).

Useful keys:
- Bio: `bio_title_1/2`, `bio_p1`, `bio_p2`, `bio_p3`, `bio_banner`, `lady_caption`, short intro `home_intro`
- Members: `role_*` (short), `roles_*` (full), `bio_vic`, `bio_hipo`, `bio_conta`, `motto_*`, `from_*`, `members_many`, `members_deck`
- Show: `show_kicker`, `show_deck`, `show_p1`, `show_p2`, `quote_contamina`
- Technical rider: `tech_*`
- Workshop: `workshop_name`, `workshop_intro`, `workshop_contents`, `workshop_duration`, `workshop_group`, `workshop_age`, `workshop_text` (one-paragraph version)
- Press quotes: `quote_kaos`, `quote_rutalokal`, `quote_beteve`, `quote_vic`, `quote_enderrock`, `quote_heart`
- Shop: `merch_<id>_name`, `merch_<id>_desc`, `shop_pay_*`
- Contact: `contact_invite`, `contact_waiting`
- Cover lines: `cover_headline`, `cover_lines`

## Rules that must be kept

- Names, exactly, never translated, never broken between first and last name:
  **Hipogrifa** (she · ella · ella · sie), **Victoria Sickness** (they · elle · elli · dey/dem),
  **Contàmina Perpétua** (they · elle · elli · dey/dem).
  Web drafts also use: it ləi / lei, fr iel / elle, pt elu / ela, gl elle / ela, eu and ja show elle/ella and they/them / she/her.
- Inclusive language: es -e (todes, bienvenide), ca -i (totis, benvingudi), gl/pt -e, it schwa (tuttə), fr point médian (toustes, invité·e).
- Contact: tyle fernández {elle} · lasmarikarmen@anartist.org · +34 644 389 757.
  Booking agency: Rebel Sound Booking (name only, no agent details).
- Social logos link to the band's own pages (usually @lasmarikarmen) — see `social:` in site.yaml.
- Do **not** use the old wide stage photo of the three on stage (`band-stage`) — Victoria doesn't like it. It has been removed everywhere.
- Credits: idea/choreo/music/costume Las Marikarmen · music production suzio (instagram.com/suzio.tarik) ·
  graphic design bicialta (linktr.ee/bicialta) · photos Lukk Pink, Juan Miguel Morales (juanmiguelmorales.blogspot.com),
  Albert Garcia (instagram.com/al.garciarome), la peralimonera (Sala Apolo dance-floor photo).
  Per-photo credits are not known except: live-apolo-dancefloor = la peralimonera; Enderrock clipping photo = Juan Miguel Morales.
  Use the general credit line when unsure.

## Brand look (web + 2026 press kit)

- Colours: pink = logo magenta `#ff00ff` · dark plum for pink text on light `#9f049b` · neon green `#3cfe2d` ·
  ink `#0e0b12` · cream `#f6f0e8` · paper `#fffaf3`.
- Fonts (Google Fonts): Anton (titles, uppercase) · Playfair Display italic (quotes, decks) · Space Mono (labels) · Inter (body).
  Japanese: Dela Gothic One + Noto Sans JP.
- Logos: `assets/img/logo-pennant-dark.png` (pink pennant + Lady Marikarmen, transparent, for dark backgrounds),
  `assets/img/logo-pennant-light.png` (for light backgrounds), `assets/img/lady.png` / `lady-hd.png` (Lady Marikarmen portrait, transparent),
  `assets/img/peineta.png` (small pink peineta icon), `favicon.ico`.

## Photo catalogue

Format: path — size — what's in it.

### Group / band
- `assets/img/photos/trio-mirror-dome.jpg` — 1800×1200 — the three under a mirrored dome, flugelhorn, sax, clarinet; pink fish costume. Main hero photo.
- `assets/img/photos/trio-sunset.jpg` — 1800×1200 — the three at sunset with baritone sax, clarinet; red/gold costumes.
- `assets/img/photos/trio-veiled-bench.jpg` — 800×533 — the three under black lace veils on a bench with Lady Marikarmen's portrait ("Te estamos esperandooo").
- `assets/img/photos/trio-white-frames.jpg` — 800×533 — the three jumping through white metal frames, blue sky.
- `assets/img/photos/cutout-destruir.png` — 768×506 — cut-out of the three with a jagged yellow glow, transparent background ("Destruir…" slogan image).
- `assets/img/band-wheelbarrow.jpg` — 1800×1200 — the three outdoors in earthy light, scissors and baskets (original: project file `Las Marikarmen 2.jpg`).
- `photo-archive/band-sky.jpg` — 2000×1333 — original: `Las Marikarmen 3.jpg`.
- `photo-archive/band-masks.jpg` — 1600×1067 — original: `Las Marikarmen 4.jpg`.
- `photo-archive/band-funeral.jpg` — 1800×1200 — original: `Las Marikarmen 5.jpg`.
- `photo-archive/band-dientes.jpg` — 1600×1067 — original: `dientes.jpg`.
- `photo-archive/band-clubs.jpg` — 800×1200 — vertical; original: `_MG_6537.jpg`.
- `photo-archive/trio-white-fur.jpg` — 800×533 — the three in white fur, outdoors.

### Live
- `assets/img/photos/live-funeral.jpg` — 800×533 — stage with flowers and Lady Marikarmen's portrait (funeral set). Used for the show.
- `assets/img/photos/live-red-stage.jpg` — red-lit stage, baritone sax, dance, clarinet.
- `assets/img/photos/live-festival-day.jpg` — daytime outdoor festival, big crowd.
- `assets/img/photos/live-split.jpg` — Victoria doing the splits on stage, seen between legs.
- `assets/img/photos/live-apolo-dancefloor.jpg` — 1600×1074 — tenor sax in the middle of the crowd, Sala Apolo (photo: la peralimonera).
- `assets/img/photos/live-crowd-hands.jpg` — crowd with hands up, purple light.
- `assets/img/photos/live-night-crowd.jpg` — night stage with crowd.
- `assets/img/photos/live-projection.jpg` — stage with video projection behind.
- `assets/img/photos/live-smoke-green.jpg` — green smoke on stage.
- `assets/img/photos/live-back-sax.jpg` — back view with sax, crowd.
- `assets/img/photos/live-back-hair.jpg` — back view, long hair, hand up, green light.
- `photo-archive/live-trio-smoke.jpg`, `live-kick.jpg`, `live-fists.jpg` — more live shots (smoke; high kick; fists up in white light).

### Members
- Claw-machine portraits (vertical 600×900, press-kit style): `assets/img/claw-vic.jpg`, `claw-hipo.jpg`, `claw-conta.jpg` (originals: `gancho peluches vic2jpg.jpg`, `gancho peluches hipo.jpg`, `gancho peluches tyle2.jpg`).
- Old-site cards with hand-lettered name, symbol and motto (1000×1000): `assets/img/photos/card-vic.jpg`, `card-hipo.jpg`, `card-conta.jpg`.
- Victoria Sickness: `assets/img/vic-aspiradora.jpg` (vertical, with vacuum cleaner; original `vic aspiradora 3A0A4376.jpg`) · `photo-archive/vic-live.jpg` (original `vic IMG_20240703_231012_379.jpg`) · `assets/img/photos/satan-daddy.jpg` (white sunglasses, "Satan is my daddy" top, painted ceiling) · `assets/img/photos/chickens.jpg` (feeding hens, green socks).
- Hipogrifa: `photo-archive/hipo-sing.jpg` (original `hipogrifa 3A0A4487.jpg`), `photo-archive/hipo-live.jpg` (original `hipogrifa 3A0A4538.jpg`).
- Contàmina Perpétua: `assets/img/conta-fur.jpg` (vertical, yellow fur, baritone sax; original `contamina 3A0A4355.jpg`) · `photo-archive/conta-leopard.jpg` (original `contamina 3A0A4432.jpg`) · `photo-archive/conta-live.jpg` (original `contamina 3A0A4543.jpg`).
- More portraits (check who is in each before captioning): `assets/img/photos/blue-camera.jpg` (blue face paint, camera), `assets/img/photos/yurt-trumpet.jpg` (trumpet, wooden lattice), `photo-archive/portrait-spray.jpg`, `portrait-pink-fur.jpg`, `platform-shoes.jpg` (close-up of platform heels on stage), `meadow.jpg` (white wig in tall grass).

### Press
- `assets/img/photos/enderrock-orgull-queer.jpg` — Enderrock "Orgull queer" magazine spread (Dec 2021), photo Juan Miguel Morales.

### Merch (`assets/img/merch/`)
`camiseta-cistema-rosa.jpg` (pink print, 15 €) · `camiseta-cistema-verde.jpg` (green XXL print, 15 €) · `abanico.jpg` (fan, 10 €) ·
`cassette-nos-pegan.jpg` (5 €) · `fanzine-nos-pegan.jpg` (5 €) · `usb-unicornios.jpg` (10 €). Bandcamp links in site.yaml → `merch:`.

## Links (also in site.yaml)

Web: lasmarikarmen.com · Bandcamp merch: lasmarikarmen.bandcamp.com/merch ·
Album «Nos pegan» on Spotify: open.spotify.com/album/0K5Uj5ANW0CpvLUnNLWD9D ·
Videos (YouTube ids): el Afilador 8dQ9giAwwBE · alta BAJEZA ft. Kiltreo Oskuro KQJ2nJZBHCs · PELASO IFF7f8r7nbA ·
POCA ROPA ft. La Maga DgmGpjpw-Pk · Ladyboi mYE5oTtRIMw · Sissy hxHuym02RKc.
