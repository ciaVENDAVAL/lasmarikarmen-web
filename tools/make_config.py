"""Builds admin/web/config.yml (Sveltia CMS forms) from the content files, so every text and setting gets a field.

Run after adding or removing text keys, or changing a content file's shape (keys missing from a form may be
dropped when someone saves it):
    python3 tools/make_config.py
Adapted from ciaVENDAVAL/victoriasickness-admin/scripts/make_config.py (La Senyal model).
The admin lives inside this site (lasmarikarmen.com/admin/), so it shares the sign-in with edit on the page."""
import json
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "admin" / "web" / "config.yml"
J = lambda p: json.loads((ROOT / "content" / p).read_text(encoding="utf-8"))
site = J("site.json")
LOCALES = site["languages"]                 # es en ca gl eu pt fr it de ja
ref = J("i18n/es.json")                     # reference language: every key that exists

GROUPS = {  # Texts form: one folding group per page section (Spanish: tyle and the band work in ES/CA)
    "general": ("General", "Pie de página, pronombres, descripción para Google y redes."),
    "nav": ("Menú y botones", None), "a11y": ("Panel de accesibilidad", None), "home": ("Portada", None),
    "about": ("Quiénes somos · integrantes", None), "show": ("Concierto", None), "music": ("Música · vídeos · Blob", None),
    "shop": ("Tienda y pedidos", None), "workshops": ("Talleres", None), "concerts": ("Fechas y escenarios", None),
    "press": ("Prensa", None), "contact": ("Contacto", None), "presskit": ("Solo press kit (PDF)", None),
    "lyrics": ("Letras", "Textos de la sección de letras (las letras mismas se cambian con Claude)."),
}
NO_TOUCH = {"pron_she": "Pronombre de Hipogrifa", "pron_they": "Pronombre de Victoria Sickness y Contàmina Perpétua"}
human = lambda k: k.replace("_", " ").capitalize()


def text_field(k, v):
    f = {"name": k, "label": NO_TOUCH.get(k, human(k)), "widget": "text" if len(v) > 70 else "string", "i18n": True}
    if k in NO_TOUCH:
        f["hint"] = "Lo elige cada persona. Nunca se traduce solo."
    if "<" in v:
        f["hint"] = "Lleva HTML (<b>, <br>, enlaces): deja las marcas tal cual."
    return f


texts = []
for g, keys in ref.items():
    lab, hint = GROUPS.get(g, (human(g), None))
    f = {"name": g, "label": lab, "widget": "object", "collapsed": True, "i18n": True,
         "fields": [text_field(k, v) for k, v in keys.items()]}
    if hint:
        f["hint"] = hint
    texts.append(f)

IMG = {"img": "assets/img/merch", "claw": "assets/img", "card": "assets/img/photos", "cover": "assets/img/video", "posters": "assets/img/posters"}


def img(name, label, folder, req=True, multiple=False):
    f = {"name": name, "label": label, "widget": "image", "media_folder": "/" + folder, "public_folder": "/" + folder, "required": req}
    if multiple:
        f["multiple"] = True
    return f


def guess(k, values, labels):
    """A field for key k, from all the values it has in the data."""
    lab = labels.get(k, human(k))
    vals = [v for v in values if v is not None]
    req = len(vals) == len(values)
    if k in IMG:
        return img(k, lab, IMG[k], req, multiple=isinstance(vals[0], list))
    v = vals[0]
    if isinstance(v, bool):
        return {"name": k, "label": lab, "widget": "boolean", "required": False}
    if isinstance(v, int):
        return {"name": k, "label": lab, "widget": "number", "value_type": "int", "required": req}
    if isinstance(v, str):
        return {"name": k, "label": lab, "widget": "text" if max(len(x) for x in vals) > 80 else "string", "required": req}
    if isinstance(v, list) and all(isinstance(x, str) for x in v):
        return {"name": k, "label": lab, "widget": "list", "required": req}
    if isinstance(v, list):
        return obj_list(k, lab, [i for x in vals for i in x], labels, req)
    if isinstance(v, dict):
        keys = list(dict.fromkeys(kk for x in vals for kk in x))
        return {"name": k, "label": lab, "widget": "object", "collapsed": True, "required": req,
                "fields": [guess(kk, [x.get(kk) for x in vals], labels) for kk in keys]}
    raise SystemExit(f"unexpected {k}: {v!r}")


def obj_list(k, lab, items, labels, req=True, summary=None, hint=None):
    keys = list(dict.fromkeys(kk for x in items for kk in x))
    f = {"name": k, "label": lab, "widget": "list", "collapsed": True, "required": req,
         "fields": [guess(kk, [x.get(kk) for x in items], labels) for kk in keys]}
    if summary:
        f["summary"] = summary
    if hint:
        f["hint"] = hint
    return f


L = {  # field labels (Spanish)
    "date": "Fecha", "kind": "Tipo", "city": "Ciudad", "venue": "Sala / lugar", "event": "Evento", "url": "Enlace",
    "posters": "Carteles", "title": "Título", "feat": "Con (ft. / prod.)", "cover": "Foto de portada",
    "id": "Código (no tocar)", "tall": "Foto vertical", "price": "Precio (€)", "sizes": "Tallas", "img": "Foto",
    "name": "Nombre", "pronoun_key": "Pronombre (no tocar)", "instagram": "Instagram (sin @)", "claw": "Foto zarpa",
    "card": "Tarjeta (foto)", "from_key": "Texto «de dónde» (no tocar)", "role_key": "Texto rol (no tocar)",
    "roles_key": "Texto roles (no tocar)", "motto_key": "Texto lema (no tocar)", "bio_key": "Texto bio (no tocar)",
    "lang": "Idioma del artículo", "title_key": "Texto del título (no tocar)", "region_key": "Región (no tocar)",
    "venues": "Escenarios", "person": "Persona", "phone": "Teléfono", "phone_href": "Teléfono para enlace (tel:+34…)",
    "email": "Email", "agency": "Agencia", "icon": "Icono (no tocar)", "year": "Año", "spotify": "Spotify",
    "spotify_embed": "Spotify (reproductor)", "producers": "Producción", "tracks": "Canciones", "first_album": "Primer disco",
    "first_album_year": "Año del primer disco",
}
VIDEO_HINT = "Pega el enlace normal del vídeo: PeerTube (https://…/w/…) o YouTube. Portada: una foto de la propia web (nunca de YouTube)."
GIG_KIND = {"name": "kind", "label": "Tipo", "widget": "select", "required": False, "dropdown_threshold": 12,
            "hint": "Vacío = concierto.", "options": [{"label": "Radio / tele / entrevista", "value": "media"}, {"label": "Disco / recopilatorio", "value": "release"}]}


def form(name, label, file, fields, icon, about=None):
    return {"name": name, "label": label, "icon": icon, "file": f"content/{file}", "fields": fields}


gigs = J("gigs.json")["gigs"]
gig_list = obj_list("gigs", "Fechas", gigs, L, summary="{{fields.date}} · {{fields.city}} · {{fields.venue}}",
                    hint="La más nueva arriba (cualquier orden vale). Fecha AAAA-MM-DD (o AAAA-MM / AAAA si no se sabe el día). Las fechas pasadas se mueven solas a «Lo petamos…» cada noche.")
gig_list.update(add_to_top=True, label_singular="fecha")
gig_list["fields"] = [GIG_KIND if f["name"] == "kind" else f for f in gig_list["fields"]]
for f in gig_list["fields"]:
    if f["name"] != "date":
        f["required"] = False
    if f["name"] == "date":
        f.update(pattern=["^\\d{4}(-\\d{2}(-\\d{2})?)?$", "AAAA-MM-DD, AAAA-MM o AAAA"])

vids = J("videos.json")
vfields = lambda items: [dict(guess(k, [x.get(k) for x in items], L), **({"hint": VIDEO_HINT} if k == "url" else {}))
                         for k in dict.fromkeys(kk for x in items for kk in x)]
music = J("music.json")
contact = J("contact.json")
press = J("press.json")["press_outlets"]
credits = J("credits.json")["credits"]
venues = J("venues.json")["concerts"]
members = J("members.json")["members"]
merch = J("merch.json")["merch"]
downloads = J("downloads.json")
theme = J("theme.json")
note = lambda text: {"name": "_about", "label": "Nota (no tocar)", "widget": "hidden", "default": text}
THEME_L = {"pink": "Rosa (principal)", "green": "Verde", "ink": "Negro (fondos oscuros)", "cream": "Crema (fondos claros)", "paper": "Papel (cajas)"}

SITE = site["site_url"].rstrip("/")
cfg = {
    "app_title": "Las Marikarmen · web",
    "logo": {"src": "/assets/img/favicon.png"},
    "backend": {"name": "github", "repo": "ciaVENDAVAL/lasmarikarmen-web", "branch": "main", "auth_methods": ["token"],
                "commit_messages": {"create": "Admin: create {{collection}} “{{slug}}”", "update": "Admin: update {{collection}} “{{slug}}”",
                                    "delete": "Admin: delete {{collection}} “{{slug}}”", "uploadMedia": "Admin: upload “{{path}}”",
                                    "deleteMedia": "Admin: delete “{{path}}”"}},
    "site_url": SITE + "/",
    "display_url": SITE + "/",
    "media_folder": "assets/img",
    "public_folder": "/assets/img",
    "media_libraries": {"default": {"config": {"slugify_filename": False, "max_file_size": 25000000}}},
    "editor": {"preview": False},
    "output": {"json": {"indent_size": 2}, "omit_empty_optional_fields": True},
    "i18n": {"structure": "multiple_folders", "locales": LOCALES, "default_locale": "es"},
    "asset_collections": [
        {"name": "photos", "label": "Fotos", "media_folder": "assets/img", "public_folder": "/assets/img", "icon": "photo_library"},
        {"name": "posters", "label": "Carteles", "media_folder": "assets/img/posters", "public_folder": "/assets/img/posters", "icon": "image"},
        {"name": "presskit", "label": "Press kits (PDF)", "media_folder": "assets/presskit", "public_folder": "/assets/presskit", "icon": "picture_as_pdf"},
        {"name": "rider", "label": "Riders (PDF)", "media_folder": "assets/rider", "public_folder": "/assets/rider", "icon": "picture_as_pdf"},
    ],
    "singletons": [
        {"name": "gigs", "label": "Fechas y carteles", "icon": "event", "file": "content/gigs.json", "fields": [gig_list]},
        {"name": "videos", "label": "Vídeos", "icon": "smart_display", "file": "content/videos.json", "fields": [
            {"name": "hero_video", "label": "Vídeo de fondo de la portada", "widget": "object", "collapsed": True,
             "hint": "Sin sonido, en bucle, detrás de la foto de la portada. Solo YouTube por ahora.", "fields": vfields([vids["hero_video"]])},
            {"name": "featured_video", "label": "Vídeo destacado (Música y portada)", "widget": "object", "collapsed": True, "fields": vfields([vids["featured_video"]])},
            {"name": "videos", "label": "Videoclips", "widget": "list", "collapsed": True, "summary": "{{fields.title}}", "label_singular": "vídeo",
             "hint": "El más nuevo primero.", "fields": vfields(vids["videos"])}]},
        {"name": "merch", "label": "Tienda: productos", "icon": "shopping_bag", "file": "content/merch.json", "fields": [
            obj_list("merch", "Productos", merch, L, summary="{{fields.id}} · {{fields.price}} €",
                     hint="Quita un producto cuando se agote. Nombre y descripción de cada uno: Textos → Tienda (merch_<código>_name / _desc).")]},
        {"name": "music", "label": "Discos y radio", "icon": "album", "file": "content/music.json",
         "fields": [guess("album", [music["album"]], L), guess("radio", [music["radio"]], L)]},
        {"name": "press", "label": "Prensa: artículos", "icon": "newspaper", "file": "content/press.json", "fields": [
            dict(obj_list("press_outlets", "Artículos", press, L, summary="{{fields.date}} · {{fields.name}}", hint="El más nuevo primero. Fecha AAAA-MM o AAAA."), add_to_top=True, label_singular="artículo")]},
        {"name": "venues", "label": "Escenarios donde hemos tocado", "icon": "stadium", "file": "content/venues.json", "fields": [
            obj_list("concerts", "Regiones", venues, L, summary="{{fields.region_key}}")]},
        {"name": "members", "label": "Integrantes", "icon": "groups", "file": "content/members.json", "fields": [
            obj_list("members", "Integrantes", members, L, summary="{{fields.name}}",
                     hint="Los textos (rol, bio, lema) están en Textos → Quiénes somos. Los nombres nunca se traducen.")]},
        {"name": "credits", "label": "Créditos (fotos, música, diseño)", "icon": "copyright", "file": "content/credits.json",
         "fields": [guess("credits", [credits], L)]},
        {"name": "contact", "label": "Contacto y redes", "icon": "contact_mail", "file": "content/contact.json",
         "fields": [guess(k, [contact[k]], L) for k in contact]},
        {"name": "downloads", "label": "PDFs: press kit y rider", "icon": "picture_as_pdf", "file": "content/downloads.json", "fields": [
            {"name": kind, "label": {"presskit": "Press kit", "rider": "Rider técnico"}[kind], "widget": "object", "collapsed": kind != "presskit",
             "hint": f"El PDF que da el botón en cada idioma. Nombre: Las-Marikarmen-{kind}-2027-01-es.pdf",
             "fields": [{"name": l, "label": l.upper(), "widget": "file", "media_folder": f"/assets/{kind}", "public_folder": f"/assets/{kind}",
                         "required": l == "es"} for l in LOCALES]} for kind in downloads]},
        {"name": "theme", "label": "Colores", "icon": "palette", "file": "content/theme.json", "fields": [note(theme["_about"])] + [
            {"name": k, "label": THEME_L.get(k, k), "widget": "color", "default": v} for k, v in theme.items() if not k.startswith("_")]},
    ],
    "collections": [
        {"name": "texts", "label": "Textos (10 idiomas)", "icon": "translate", "i18n": True,
         "description": "Todos los textos de la web, por secciones. Cambia un idioma y guarda: los demás se traducen solos en unos minutos (traductor libre de Softcatalà; el japonés no, se avisa en el historial). Revisa siempre la traducción.",
         "files": [{"name": "all", "label": "Todos los textos", "file": "content/i18n/{{locale}}.json", "i18n": True, "fields": texts}]},
    ],
}


def radios(x):  # phones: short selects as radio buttons (a searchable dropdown opens and closes the keyboard)
    if isinstance(x, dict):
        if x.get("widget") == "select":
            x.setdefault("dropdown_threshold", 12)
        if str(x.get("name", "")).endswith("_key") and "widget" in x and not x.get("i18n"):
            x["readonly"] = True   # links to a text in Textos: changing it would break the page
        for v in x.values():
            radios(v)
    elif isinstance(x, list):
        for v in x:
            radios(v)


radios(cfg)


def reorder(data, fields):
    """Data in the order of its form's fields (otherwise the first Save shows a big reorder diff)."""
    if isinstance(data, list):
        return [reorder(x, fields) for x in data]
    if not isinstance(data, dict):
        return data
    names = [f["name"] for f in fields]
    out = {k: data[k] for k in names if k in data}
    out.update({k: v for k, v in data.items() if k not in out})
    for f in fields:
        if f["name"] in out and f.get("fields"):
            out[f["name"]] = reorder(out[f["name"]], f["fields"])
    return out


for sg in cfg["singletons"]:
    p = ROOT / sg["file"]
    old = p.read_text(encoding="utf-8")
    new = json.dumps(reorder(json.loads(old), sg["fields"]), ensure_ascii=False, indent=2) + "\n"
    if new != old:
        p.write_text(new, encoding="utf-8")
        print("reordered", sg["file"])


class D(yaml.SafeDumper):
    pass


D.add_representer(str, lambda d, s: d.represent_scalar("tag:yaml.org,2002:str", s, style='"' if s in ("on", "off", "yes", "no") else None))
head = "# Sveltia CMS config for lasmarikarmen-web — generated by tools/make_config.py — edit that script, not this file.\n# Docs: https://sveltiacms.app/en/docs\n"
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(head + yaml.dump(cfg, Dumper=D, sort_keys=False, allow_unicode=True, width=200), encoding="utf-8")
print("ok", sum(len(g["fields"]) for g in texts), "texts in", len(texts), "groups,", len(LOCALES), "languages")
