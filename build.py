#!/usr/bin/env python3
"""Build the Las Marikarmen website.

    python3 build.py            build the published languages into _site/
    python3 build.py --all      also build every planned language (missing text falls back to es) — for previews
    python3 build.py --check    list missing translations per language, build nothing

Text:      content/i18n/<lang>.json   (translatable; grouped by page section; es = reference)
Data:      content/*.json           (one file per admin form: gigs, videos, merch, members, press…)
Settings:  content/site.json        (technical, no form: languages, addresses)
           Edited from the phone with the admin (/admin/) or on the page (#edit) — see UPDATING.md
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
    ("contacto",       "contacto.html",       "nav_contact",   "nav_contact"),
    ("blob",           "blob.html",           None,            "nav_blob"),
]
# Menu: (page, text key, anchor)
NAV = [
    # (page, text key, anchor, [sub-items (page, text key, anchor)])
    ("quienes-somos", "nav_bio", "", [("quienes-somos", "nav_band", ""), ("quienes-somos", "nav_members", "#members"),
                                      ("quienes-somos", "nav_press", "#prensa")]),
    ("espectaculo", "nav_events", "", [("espectaculo", "nav_show", ""), ("espectaculo", "nav_workshops", "#talleres"),
                                       ("espectaculo", "nav_calendar", "#conciertos"), ("espectaculo", "nav_posters", "#past-h")]),
    ("musica", "nav_music", "", [("musica", "nav_albums", ""), ("musica", "nav_videos", "#vid-h"), ("musica", "nav_blob", "#blob"), ("musica", "nav_lyrics", "#letras")]),
    ("tienda", "nav_shop", "", []), ("contacto", "nav_contact", "", []),
]
# Old pages now living inside others: the old address forwards to the new spot
REDIRECTS = {"letras": ("musica", "#letras"), "talleres": ("espectaculo", "#talleres"),
             "conciertos": ("espectaculo", "#conciertos"), "prensa": ("quienes-somos", "#prensa")}
ALL_LANGS = ["es", "en", "ca", "gl", "eu", "pt", "fr", "it", "de", "ja"]
SOURCE = "es"


import json

# one JSON file per admin form; their top-level keys are merged into `site` for the templates
FORM_FILES = ["contact.json", "members.json", "music.json", "videos.json", "merch.json", "gigs.json",
              "press.json", "credits.json", "venues.json"]


def _J(name):
    return json.loads((ROOT / "content" / name).read_text(encoding="utf-8"))


def _unslash(x):
    """The admin stores files as /assets/…; the templates want assets/… (they add the page's root)."""
    if isinstance(x, str):
        return x[1:] if x.startswith("/assets/") else x
    if isinstance(x, list):
        return [_unslash(i) for i in x]
    if isinstance(x, dict):
        return {k: _unslash(v) for k, v in x.items()}
    return x


MAX_SIDE = 1800


def shrink_photos(folder):
    """Photos uploaded from a phone can be huge: the published copy is at most 1800 px (the repo keeps the original).
    Never cropped. Same input → same output, so rebuilding changes nothing."""
    from PIL import Image, ImageOps
    for p in folder.rglob("*"):
        if p.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
            continue
        with Image.open(p) as im:
            if max(im.size) <= MAX_SIDE and not im.getexif().get(0x0112, 1) != 1:
                continue
            im = ImageOps.exif_transpose(im)
            im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
            if p.suffix.lower() in (".jpg", ".jpeg"):
                im.convert("RGB").save(p, quality=84, optimize=True, progressive=True)
            else:
                im.save(p, optimize=True)


def video_info(v):
    """A video is a YouTube or PeerTube link (+ a cover photo from the site's own images, never YouTube's).
    Adds: id (YouTube only), watch (link), embed (player address)."""
    import urllib.parse as up
    v = dict(v)
    u = (v.get("url") or "").strip()
    q = up.urlparse(u)
    yt = None
    if "youtu.be" in q.netloc:
        yt = q.path.strip("/")
    elif "youtube" in q.netloc:
        yt = up.parse_qs(q.query).get("v", [None])[0] or q.path.rstrip("/").split("/")[-1]
    if yt:
        v.update(id=yt, watch=f"https://www.youtube.com/watch?v={yt}",
                 embed=f"https://www.youtube-nocookie.com/embed/{yt}?autoplay=1&rel=0")
    elif u:   # PeerTube: https://<instance>/w/<id> or /videos/watch/<id>
        vid = q.path.rstrip("/").split("/")[-1]
        v.update(id=None, watch=u, embed=f"{q.scheme}://{q.netloc}/videos/embed/{vid}?autoplay=1&title=0&warningTitle=0&peertubeLink=0&p2p=0")
    v.setdefault("cover", f"assets/img/video/{yt}.jpg" if yt else "")
    return v


def load_content():
    site = _J("site.json")
    for f in FORM_FILES:
        site.update(_J(f))
    site.update(_J("downloads.json"))          # presskit / rider: {lang: file}
    site["theme"] = {k: v for k, v in _J("theme.json").items() if not k.startswith("_")}
    site = _unslash(site)
    for k in ("hero_video", "featured_video"):
        if site.get(k):
            site[k] = video_info(site[k])
    site["videos"] = [video_info(v) for v in site.get("videos", [])]
    # the admin leaves out empty fields: give the templates their defaults back
    for o in site.get("press_outlets", []):
        o.setdefault("date", "")
    text = {}                                  # key -> {lang: text}
    for lang in ALL_LANGS:
        p = ROOT / "content" / "i18n" / f"{lang}.json"
        if p.exists():
            for group in json.loads(p.read_text(encoding="utf-8")).values():
                for k, v in group.items():
                    text.setdefault(k, {})[lang] = v
    return text, site


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
    shrink_photos(OUT / "assets" / "img")
    (OUT / ".nojekyll").write_text("")
    shutil.copytree(ROOT / "admin", OUT / "admin")   # forms admin (Sveltia CMS) at /admin/
    # Lyrics: letras/build.py turns the lyrics + translations into letras/data.json
    import subprocess, json as _json
    subprocess.run([sys.executable, "build.py"], cwd=ROOT / "letras", check=True, stdout=subprocess.DEVNULL)
    lyrics = _json.loads((ROOT / "letras" / "data.json").read_text(encoding="utf-8"))
    # Blob Marikarmen toy: blob/toy.{css,html,js} + texts in blob/i18n.yaml, rendered inside the site page blob.html
    import html as _html, json as _bjson
    blob_src = {k: (ROOT / "blob" / f"toy.{k}").read_text(encoding="utf-8") for k in ("css", "html", "js")}
    blob_i18n = yaml.safe_load((ROOT / "blob" / "i18n.yaml").read_text(encoding="utf-8"))

    def blob_parts(lang):
        bt = blob_i18n.get(lang) or blob_i18n[SOURCE]
        h = blob_src["html"]
        for k, v in bt.items():
            if isinstance(v, str):
                h = h.replace(f"__H_{k}__", _html.escape(v))
        j = blob_src["js"].replace("__I18N_JSON__", _bjson.dumps(bt, ensure_ascii=False))
        assert "__H_" not in h and "__I18N" not in j and "</script" not in j.lower(), lang
        return {"css": Markup(blob_src["css"]), "html": Markup(h), "js": Markup(j), "desc": bt["desc"]}

    if (ROOT / "favicon.ico").exists():
        shutil.copy(ROOT / "favicon.ico", OUT / "favicon.ico")
    import hashlib
    asset_v = hashlib.sha1(b''.join((ROOT / f).read_bytes() for f in ('assets/css/style.css', 'assets/css/fonts.css', 'assets/js/site.js', 'assets/js/letras.js', 'assets/js/edit.js', 'assets/js/fluid.js'))).hexdigest()[:8]
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
        base_root = "" if lang == default else "../"
        root = base_root
        missing = set()

        def t(key, _lang=lang):
            if key not in text:
                raise KeyError(f"content/i18n/es.json has no key '{key}'")
            entry = text[key] or {}
            val = entry.get(_lang)
            if not val:
                missing.add(key)
                val = entry.get(SOURCE, "")
            return Markup(val)

        def page_url(slug, target_lang=lang):
            # clean addresses: /<lang>/<slug>/ (no .html); the home page is the language folder itself
            target_sub = "" if target_lang == default else f"{target_lang}/"
            name = "" if slug == "index" else f"{slug}/"
            return f"{root}{target_sub}{name}" or "./"

        presskit = site["presskit"].get(lang) or site["presskit"][SOURCE]
        rider = (site.get("rider") or {}).get(lang) or (site.get("rider") or {}).get(SOURCE)
        # every language a PDF exists in, for the small language dropdown next to each press kit / rider link
        pdf_files = {kind: [(l, (site.get(kind) or {})[l]) for l in langs if (site.get(kind) or {}).get(l)
                            and (ROOT / (site.get(kind) or {})[l]).exists()] for kind in ("presskit", "rider")}
        preview = {}
        for slug, tpl, nav_key, title_key in PAGES:
            root = base_root if slug == "index" else base_root + "../"
            ctx = dict(
                t=t, lang=lang, langs=langs if len(langs) > 1 else [], site=site,
                lang_names=site["language_names"], root=root, page_url=page_url, og_tags=og_tags, lyrics_json=lambda: lyrics_for(lyrics, t, page_url, lang), lyrics_video={s['desc'].get('video'): s['slug'] for s in lyrics if s['desc'].get('video')},
                slug=slug, pages=PAGES, nav=NAV, icons=icons, asset_v=asset_v, gigs=gigs, past_gigs=past_gigs, past_years=past_years, presskit=root + presskit, rider=(root + rider) if rider else None, pdfs={k: [(l, root + f) for l, f in v] for k, v in pdf_files.items()},
                page_title=(t(title_key) if title_key else None),
                blob=blob_parts(lang) if slug == "blob" else None,
                page_desc=blob_parts(lang)["desc"] if slug == "blob" else None,
                canonical=f"{site['site_url'].rstrip('/')}/{sub}{'' if slug == 'index' else slug + '/'}",
            )
            html = env.get_template(tpl).render(**ctx)
            dest = OUT / sub / ("index.html" if slug == "index" else f"{slug}/index.html")
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(html, encoding="utf-8")
            # link-preview tags (title, description, image) for the bridge pages below
            preview[slug] = "\n".join(re.findall(r'<meta (?:property="og:[^"]+"|name="(?:twitter:[^"]+|description)")[^>]*>', html))
        # old addresses keep working: <page>.html → <page>/ and pages that moved inside others → <page>/#anchor.
        # GitHub Pages answers /musica (no slash) with musica.html, so these bridges carry the target's full address
        # and its link-preview tags: a link shared in WhatsApp/Telegram/Signal still shows picture and text.
        home = f"{site['site_url'].rstrip('/')}/{sub}"
        def redirect(path, slug, anchor=""):
            (OUT / sub / path).parent.mkdir(parents=True, exist_ok=True)
            (OUT / sub / path).write_text(env.get_template("redirect.html").render(
                lang=lang, target=f"{home}{slug}/{anchor}", preview=Markup(preview.get(slug, ""))), encoding="utf-8")
        for slug, *_ in PAGES:
            if slug != "index":
                redirect(f"{slug}.html", slug)
        for old, (new, anchor) in REDIRECTS.items():
            redirect(f"{old}.html", new, anchor)
            redirect(f"{old}/index.html", new, anchor)
        if lang != SOURCE and missing:
            print(f"  {lang}: {len(missing)} texts shown in castellano (missing translation)")
    print(f"Built {len(langs)} language(s) × {len(PAGES)} pages → {OUT.relative_to(ROOT)}/")


OG_LOCALE = {"es": "es_ES", "en": "en_GB", "ca": "ca_ES", "gl": "gl_ES", "eu": "eu_ES", "pt": "pt_PT",
             "fr": "fr_FR", "it": "it_IT", "de": "de_DE", "ja": "ja_JP"}


LYR_LANGS = ("es", "en", "ca", "gl", "eu", "pt", "fr", "it", "de", "ja")


def lyrics_for(songs, t, page_url, lang):
    """Lyrics data for one site language: '@key' texts become translated strings, '@page:x' site links."""
    import json as _json
    def r(v):
        if not isinstance(v, str) or not v.startswith("@"):
            return v
        k, _, n = v[1:].partition(":")
        if k == "page":
            return page_url(n)
        return str(t(k)).replace("{n}", n)
    def walk(x):
        if isinstance(x, list): return [walk(i) for i in x]
        if isinstance(x, dict): return {k: walk(v) for k, v in x.items()}
        return r(x)
    def only(seg):  # keep the original and this page's language only
        return {k: v for k, v in seg.items() if k not in LYR_LANGS or k == lang}
    data = [dict(s, desc=walk(s["desc"]), blocks=[dict(b, segs=[only(g) for g in b["segs"]]) if "segs" in b else b for b in s["blocks"]])
            for s in songs]
    return Markup(_json.dumps(data, ensure_ascii=False).replace("</", "<\\/"))


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

    text, site = load_content()
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
