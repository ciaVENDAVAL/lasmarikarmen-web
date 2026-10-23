# Las Marikarmen — web

Static website for Las Marikarmen, in the style of the 2026 press kit.
Short info on the home page, one page per topic:

| Page | File |
|---|---|
| Inicio | `index.html` |
| Quiénes somos | `quienes-somos.html` |
| Integrantes | `integrantes.html` |
| Espectáculo | `espectaculo.html` |
| Talleres | `talleres.html` |
| Prensa | `prensa.html` |
| Contratación y contacto | `contratacion.html` |

## Where things live

- **`content/text.yaml`** — every text on the site, one entry per key with a line per language (`es`, `ca`, `de`, `it`, `fr`, `eu`). Keys match the press-kit master text where they exist.
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

## Adding a language

1. Fill in the language line (e.g. `ca:`) for each key in `content/text.yaml`.
2. Check what is missing: `python3 build.py --check`
3. Add the code to `languages:` in `content/site.yaml` (e.g. `[es, ca]`). A language switcher appears in the menu automatically; pages go to `/ca/…`.
4. Optional: add its PDF under `presskit:` in `site.yaml`.

Preview every language before it is complete (missing text shows in castellano):
`python3 build.py --all`

## Build locally

```
pip install -r requirements.txt
python3 build.py
python3 -m http.server -d _site 8000   # open http://localhost:8000
```

Photos: Lukk Pink, Juan Miguel Morales, Albert Garcia · Design: bicialta · Music production: suzio
