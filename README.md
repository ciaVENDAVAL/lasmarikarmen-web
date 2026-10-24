# Las Marikarmen — web

Static website for Las Marikarmen, in the style of the 2026 press kit.
Short info on the home page, one page per topic:

| Page | File |
|---|---|
| Inicio | `index.html` |
| Quiénes somos + integrantes | `quienes-somos.html` |
| Espectáculo + condiciones técnicas | `espectaculo.html` |
| Música y vídeos | `musica.html` |
| Tienda | `tienda.html` |
| Talleres | `talleres.html` |
| Conciertos (próximas fechas + memorables) | `conciertos.html` |
| Prensa | `prensa.html` |
| Contacto + ficha artística | `contacto.html` |

Social icons, contact and press kit appear once, in the footer of every page.
Bottom left: pink triangle ▼ opens the accessibility options. Bottom right: ▲ back to top.

**Gigs:** add lines under `gigs:` in `content/site.yaml` (posters in `assets/img/posters/`). Past dates move by themselves to "Lo petamos…", grouped by year (the site rebuilds every night).
**Shop:** products are under `merch:` in `site.yaml`; remove a line when it sells out.

## Where things live

- **`content/text.yaml`** — every text on the site, one entry per key with a line per language (`es`, `en`, `ca`, `gl`, `eu`, `pt`, `fr`, `it`, `de`, `ja`). Keys match the press-kit master text where they exist.
- **`content/site.yaml`** — things that are not translated: published languages, links, social media, members' names and pronoun keys, album tracklist, concert venues, credits.
- **`templates/`** — page layouts (Jinja2).
- **`assets/`** — CSS, photos, logos, icons, press-kit PDFs.

Names are never translated and never broken across lines: Hipogrifa (ella), Victoria Sickness (elle), Contàmina Perpétua (elle).
Pronouns: ES elle · CA elli · DE dey/dem.

## Publish on GitHub Pages (once)

1. Create a new repository on github.com (e.g. `lasmarikarmen-web`) and upload these files (or `git push`).
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` rebuilds and publishes the site. The address appears under Settings → Pages (first `https://<user>.github.io/lasmarikarmen-web/`).
4. When ready to move the domain: write `lasmarikarmen.com` in `cname:` in `content/site.yaml`, add the domain in Settings → Pages → Custom domain, and point the DNS to GitHub Pages at your domain provider.

You can edit `content/text.yaml` directly on github.com (pencil icon) — the site rebuilds by itself.

## Languages

Published: es (root), en, ca, gl, eu, pt, fr, it, de, ja — each in its own folder (`/en/`, `/ca/`…).
The language button sits in the top bar, next to the menu. On a first visit, the home page opens in the
browser's language if the site has it; after that the visitor's choice is remembered.

- Edit any text in `content/text.yaml` (all languages side by side).
- Check what is missing: `python3 build.py --check`
- To give one language to a translator:
  `python3 tools/merge_lang.py --export fr > fr.yaml` (shows the castellano above each line),
  then merge the file back: `python3 tools/merge_lang.py fr fr.yaml --replace`
- To hide a language, remove it from `languages:` in `content/site.yaml`.

## Build locally

```
pip install -r requirements.txt
python3 build.py
python3 -m http.server -d _site 8000   # open http://localhost:8000
```

Photos: Lukk Pink, Juan Miguel Morales, Albert Garcia, la peralimonera · Design: bicialta · Music production: suzio
