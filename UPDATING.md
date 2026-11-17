# Updating lasmarikarmen.com

Three ways, all ending as a commit on `main` (history = undo). The workflow `.github/workflows/pages.yml` then
translates, builds and publishes: changes show in **3–5 minutes** (reload the page).

| Way | Where | For |
|---|---|---|
| **Edit on the page** | any page + `#edit` (e.g. `https://www.lasmarikarmen.com/#edit`) | tap a text and type, tap a photo or a PDF button to replace it, move between pages and languages, **Publicar** once |
| **Forms** (Sveltia CMS) | `https://www.lasmarikarmen.com/admin/` | every text in 10 languages, gigs + posters, videos, shop, press, members, discs, credits, contact, PDFs, colours |
| **Code** | this repo | templates, layout, new sections, lyrics, the Blob toy |

Sign-in: one GitHub fine-grained token (owner ciaVENDAVAL, only `lasmarikarmen-web`, Contents: Read and write). Steps on the
admin start page. Admin and site share the address, so signing in to one signs in to the other; **Sign Out** in the forms clears both.

## Auto-translation
`tools/translate.py` (Softcatalà's open models via Catalan, run in the workflow; no Google, no Amazon). A text changed in
**one** language only is translated into the others; Japanese is **not** auto-translated (the open model loses names and
marks) — the bot's commit message lists what Japanese still needs. `[no-translate]` in a commit message (or unticking
*Traducir* in the on-page editor) skips it. Names, song titles and identity words in `content/facts.json → do_not_translate`
stay as written; `terms` use each language's form. **Pronouns are not guaranteed**: Hipogrifa she · Victoria Sickness and
Contàmina Perpétua they (ES elle, CA elli, DE dey/dem). Read every translation.

## Rules
- **Pull first** if you work from a computer: the forms, the on-page editor and the translation bot commit too.
- After adding/removing text keys or changing a content file's shape: `python3 tools/make_config.py` (regenerates
  `admin/web/config.yml` and puts the JSON in the forms' field order), then commit both.
- Before pushing: `python3 build.py && python3 tools/check.py` (names, pronouns, missing files, private data — this repo is public).
- Photos are never cropped; the build makes a lighter copy (max 1800 px) of big uploads, the repo keeps the original.
- Fonts are self-hosted (`assets/fonts/`, OFL, from fontsource via npm; `assets/css/fonts.css` / `fonts-ja.css`). No Google Fonts.
- Videos: a `url` is a YouTube or PeerTube link; the cover is always one of the site's own images (`assets/img/video/`), never YouTube's.
  The home-page background video still needs YouTube (PeerTube there shows the photo only).
