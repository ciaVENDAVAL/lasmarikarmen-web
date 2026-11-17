# lasmarikarmen-web (PUBLIC)

Website lasmarikarmen.com of Las Marikarmen. **Public repo:** no fees, bank data, ID numbers or private contact data.

- Read `README.md` (structure) and `UPDATING.md` (how it is edited). **Always `git pull` first**: the forms admin (`/admin/`),
  the on-page editor (`#edit`, `assets/js/edit.js`) and the translation bot commit straight to `main`.
- Content: `content/i18n/<lang>.json` (texts, es = reference), one `content/*.json` per admin form, `content/site.json`
  (technical, no form), `content/facts.json` (names, pronouns, terms). After changing keys or shapes: `python3 tools/make_config.py`.
- Build `python3 build.py` → `_site/` (never edit `_site/`), check `python3 tools/check.py`. Push to `main` publishes (Actions).
- Names never translated nor broken across lines: Hipogrifa (she/ella), Victoria Sickness (they — elle/elli/dey), Contàmina Perpétua (they).
- No Google, no Amazon where possible: fonts self-hosted, no YouTube thumbnails, translation with Softcatalà, video links may be PeerTube.
- Commit identity: `tyle fernández <lasmarikarmen@anartist.org>`.
- Model: Victoria Sickness / La Senyal handoff ("browser admin + edit on the page"); the admin lives inside this repo (`admin/`)
  instead of a separate `lasmarikarmen-admin` repo.
