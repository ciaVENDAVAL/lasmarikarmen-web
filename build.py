#!/usr/bin/env python3
"""Build the Las Marikarmen website.

    python3 build.py            build the published languages into _site/
    python3 build.py --all      also build every planned language (missing text falls back to es) — for previews
    python3 build.py --check    list missing translations per language, build nothing

Text:      content/text.yaml   (translatable, one entry per key and language)
Settings:  content/site.yaml   (languages, links, names, venues…)
Templates: templates/*.html    (Jinja2)
Static:    assets/             (copied as-is)
"""
import argparse
import re
import shutil
import sys
from datetime import date
from pathlib import Path

import yaml
from jinja2 import Environment, FileSystemLoader, StrictUndefined
from markupsafe import Markup

ROOT = Path(__file__).parent
OUT = ROOT / "_site"

# slug, template, nav key (None = not in nav), page-title key
PAGES = [
    ("index",          "index.html",          "nav_home",      None),
    ("quienes-somos",  "quienes-somos.html",  "nav_bio",       "nav_bio"),
    ("espectaculo",    "espectaculo.html",    "nav_show",      "nav_show"),
    ("musica",         "musica.html",         "nav_music",     "nav_music"),
    ("tienda",         "tienda.html",         "nav_shop",      "nav_shop"),
    ("talleres",       "talleres.html",       "nav_workshops", "nav_workshops"),
    ("conciertos",     "conciertos.html",     "nav_gigs",      "nav_gigs"),
    ("prensa",         "prensa.html",         "nav_press",     "nav_press"),
    ("contacto",       "contacto.html",       "nav_contact",   "nav_contact"),
]
ALL_LANGS = ["es", "en", "ca", "gl", "eu", "pt", "fr", "it", "de", "ja"]
SOURCE = "es"


def load_yaml(name):
    with open(ROOT / "content" / name, encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_icons():
    icons = {}
    for svg in (ROOT / "assets" / "icons").glob("*.svg"):
        s = svg.read_text(encoding="utf-8")
        s = re.sub(r"<title>.*?</title>", "", s)
        s = s.replace("<svg ", '<svg aria-hidden="true" focusable="false" fill="currentColor" ', 1)
        icons[svg.stem] = Markup(s)
    return icons


def missing_report(text, langs):
    report = {}
    for lang in langs:
        if lang == SOURCE:
            continue
        report[lang] = [k for k, v in text.items() if not (v or {}).get(lang)]
    return report


def build(langs, text, site):
    env = Environment(loader=FileSystemLoader(ROOT / "templates"), autoescape=True,
                      undefined=StrictUndefined, trim_blocks=True, lstrip_blocks=True)
    icons = load_icons()
    published = site["languages"]
    default = published[0]

    site["site_url"] = ("https://" + site["cname"].strip()) if (site.get("cname") or "").strip() else site.get("pages_url", site["site_url"])
    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(ROOT / "assets", OUT / "assets")
    (OUT / ".nojekyll").write_text("")
    # Lyrics page (castellano UI, translations EN/ES/EU) — source in letras/
    import subprocess
    subprocess.run([sys.executable, "build.py"], cwd=ROOT / "letras", check=True, stdout=subprocess.DEVNULL)
    lyr = (ROOT / "letras" / "page-embed.html").read_text(encoding="utf-8")
    (OUT / "letras.html").write_text('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<link rel="icon" href="favicon.ico">\n' + og_tags(site, "letras.html", "Letras y traducciones · Las Marikarmen",
        "Letras de Las Marikarmen con traducción por estrofa a castellano, English y euskara.", "letras", "es") + '</head>\n<body>\n' + lyr + '\n</body>\n</html>\n', encoding="utf-8")
    if (ROOT / "favicon.ico").exists():
        shutil.copy(ROOT / "favicon.ico", OUT / "favicon.ico")
    import hashlib
    asset_v = hashlib.sha1(b''.join((ROOT / f).read_bytes() for f in ('assets/css/style.css', 'assets/js/site.js'))).hexdigest()[:8]
    today = date.today().isoformat()
    all_gigs = site.get("gigs") or []
    gigs = sorted((g for g in all_gigs if str(g["date"]) >= today), key=lambda g: str(g["date"]))
    def _end(d):  # a gig dated "2024-08" or "2024" counts as past once that month/year is over
        d = str(d); return d + "-99" if len(d) == 7 else (d + "-99-99" if len(d) == 4 else d)
    past_gigs = sorted((g for g in all_gigs if _end(g["date"]) < today), key=lambda g: str(g["date"]), reverse=True)
    gigs = sorted((g for g in all_gigs if _end(g["date"]) >= today), key=lambda g: str(g["date"]))
    past_years = []
    for g in past_gigs:
        y = str(g["date"])[:4]
        if not past_years or past_years[-1][0] != y: past_years.append((y, []))
        past_years[-1][1].append(g)
    if site.get("cname"):
        (OUT / "CNAME").write_text(site["cname"].strip() + "\n")

    for lang in langs:
        sub = "" if lang == default else f"{lang}/"
        root = "" if lang == default else "../"
        missing = set()

        def t(key, _lang=lang):
            if key not in text:
                raise KeyError(f"text.yaml has no key '{key}'")
            entry = text[key] or {}
            val = entry.get(_lang)
            if not val:
                missing.add(key)
                val = entry.get(SOURCE, "")
            return Markup(val)

        def page_url(slug, target_lang=lang):
            # link from the current language folder to <slug> in target_lang
            target_sub = "" if target_lang == default else f"{target_lang}/"
            name = "index.html" if slug == "index" else f"{slug}.html"
            return f"{root}{target_sub}{name}"

        presskit = site["presskit"].get(lang) or site["presskit"][SOURCE]
        for slug, tpl, nav_key, title_key in PAGES:
            ctx = dict(
                t=t, lang=lang, langs=langs if len(langs) > 1 else [], site=site,
                lang_names=site["language_names"], root=root, page_url=page_url, og_tags=og_tags,
                slug=slug, pages=PAGES, icons=icons, asset_v=asset_v, gigs=gigs, past_gigs=past_gigs, past_years=past_years, presskit=root + presskit,
                page_title=(t(title_key) if title_key else None),
                canonical=f"{site['site_url'].rstrip('/')}/{sub}{'' if slug == 'index' else slug + '.html'}",
            )
            html = env.get_template(tpl).render(**ctx)
            dest = OUT / sub / ("index.html" if slug == "index" else f"{slug}.html")
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(html, encoding="utf-8")
        if lang != SOURCE and missing:
            print(f"  {lang}: {len(missing)} texts shown in castellano (missing translation)")
    print(f"Built {len(langs)} language(s) × {len(PAGES)} pages → {OUT.relative_to(ROOT)}/")


OG_LOCALE = {"es": "es_ES", "en": "en_GB", "ca": "ca_ES", "gl": "gl_ES", "eu": "eu_ES", "pt": "pt_PT",
             "fr": "fr_FR", "it": "it_IT", "de": "de_DE", "ja": "ja_JP"}


def og_tags(site, path, title, desc, image, lang):
    """Open Graph / Twitter tags for link previews (WhatsApp, Telegram, Signal, etc.)."""
    from html import escape as e
    base = site["site_url"].rstrip("/")
    img = f"{base}/assets/img/og/{image}.jpg"
    return "".join(f'<meta {k}="{a}" content="{e(str(v))}">\n' for k, a, v in [
        ("property", "og:type", "website"), ("property", "og:site_name", "Las Marikarmen"),
        ("property", "og:title", title), ("property", "og:description", desc),
        ("property", "og:url", f"{base}/{path}"), ("property", "og:locale", OG_LOCALE.get(lang, "es_ES")),
        ("property", "og:image", img), ("property", "og:image:secure_url", img),
        ("property", "og:image:type", "image/jpeg"), ("property", "og:image:width", 1200),
        ("property", "og:image:height", 630), ("property", "og:image:alt", "Las Marikarmen"),
        ("name", "twitter:card", "summary_large_image"), ("name", "twitter:image", img)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="build every planned language (preview)")
    ap.add_argument("--check", action="store_true", help="only report missing translations")
    args = ap.parse_args()

    text, site = load_yaml("text.yaml"), load_yaml("site.yaml")
    if args.check:
        for lang, keys in missing_report(text, ALL_LANGS).items():
            done = len(text) - len(keys)
            print(f"{lang}: {done}/{len(text)} translated" + (f" — missing: {', '.join(keys)}" if keys else " ✔"))
        return
    langs = list(site["languages"])
    if args.all:
        langs += [l for l in ALL_LANGS if l not in langs]
    build(langs, text, site)


if __name__ == "__main__":
    sys.exit(main())
