"""Change one language, the others follow.

After a push, finds every text that changed in ONE language only (the other languages still have
their old text) and translates it into the other languages with Softcatalà's open-source neural
models (run here, no account, no key, no Google/Amazon), then saves those files.
Texts changed in two or three languages are left alone (someone translated them by hand).

  python3 tools/translate.py <old-commit>                     (pip install ctranslate2 sentencepiece ruamel.yaml)
  python3 tools/translate.py <old-commit> --dry-run           (shows what it would translate)

Covers (lasmarikarmen-web): content/i18n/{es,en,ca,gl,eu,pt,fr,it,de,ja}.json — every text of the site.
Every pair goes through Catalan (Softcatalà has CA↔ES/EN/GL/EU/PT/FR/IT/DE/JA). Names in content/facts.json →
do_not_translate stay as written; `terms` use each language's form; HTML tags (<b>, <br>, links) are kept.
Pronouns are NOT guaranteed by the models (Hipogrifa she; Victoria Sickness and Contàmina Perpétua they —
elle / elli / dey): the checker flags known wrong forms, a human must read every translation.
Run by .github/workflows/pages.yml before the build. A commit message containing [no-translate] skips it.
Copied from Victoria Sickness (ciaVENDAVAL/victoriasickness-web, from La Senyal) — changes marked "LM:"."""
import json, os, re, subprocess, sys, urllib.request, urllib.error
from io import StringIO
from pathlib import Path
from ruamel.yaml import YAML
from ruamel.yaml.scalarstring import DoubleQuotedScalarString as DQ

ROOT = Path(__file__).resolve().parent.parent
# ---- settings (change these to reuse the script on another site) ----
LANGS = ["es", "en", "ca", "gl", "eu", "pt", "fr", "it", "de", "ja"]   # LM   # the first one is the reference for which keys exist
LANGS = os.environ.get("TRANSLATE_LANGS", ",".join(LANGS)).split(",")   # VS: tests may use fewer
I18N = "content/i18n/{lang}.json"          # one texts file per language: .yml or .json
PAGES = None                               # folder of Markdown pages per language (None = no pages)
NO_AUTO = {"ja"}   # LM: the open Japanese model is too weak for the site (names and tags get lost): listed for a human instead
SKIP = {"lang_label", "pron_she", "pron_they"}   # LM: keys never translated (pronouns are chosen by the people themselves)
# ----------------------------------------------------------------------
FACTS = json.loads((ROOT / "content/facts.json").read_text())   # VS: facts live in content/facts.json
KEEP = sorted(FACTS.get("do_not_translate") or [], key=len, reverse=True)
TERMS = FACTS.get("terms") or []

yaml = YAML()
yaml.preserve_quotes = True
yaml.width = 10_000
yaml.indent(mapping=2, sequence=4, offset=2)

def git_show(rev, path):
    r = subprocess.run(["git", "show", f"{rev}:{path}"], cwd=ROOT, capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None

# ---------- translation engine: Softcatalà's open neural models (no Google, no Amazon) ----------
# https://github.com/Softcatala/nmt-models — MIT licence, the same models as softcatala.org/traductor,
# downloaded from softcatala.org and run here with CTranslate2. CA↔ES and CA↔EN directly; ES↔EN via CA.
import unicodedata, zipfile, shutil
MODELS = {"cat-eng": "cat-eng-2024-09-29", "eng-cat": "eng-cat-2024-09-24",
          "cat-spa": "cat-spa-2022-11-17", "spa-cat": "spa-cat-2022-11-16",
          # VS: the other website languages (all on softcatala.org, MIT)
          "cat-eus": "cat-eus-2024-08-12", "eus-cat": "eus-cat-2024-08-09",
          "cat-fra": "cat-fra-2024-08-30", "fra-cat": "fra-cat-2024-08-29",
          "cat-ita": "cat-ita-2024-08-30", "ita-cat": "ita-cat-2024-08-29",
          "cat-por": "cat-por-2022-11-18", "por-cat": "por-cat-2022-11-16",
          "cat-deu": "cat-deu-2024-10-06", "deu-cat": "deu-cat-2024-10-02",
          # LM: Galician and Japanese (same place, same layout)
          "cat-glg": "cat-glg-2024-09-04", "glg-cat": "glg-cat-2024-09-03",
          "cat-jpn": "cat-jpn-2024-10-08", "jpn-cat": "jpn-cat-2024-10-04"}
MODEL_URL = "https://www.softcatala.org/pub/softcatala/opennmt/models/2022-11-22/{}.zip"
CODE = {"ca": "cat", "es": "spa", "en": "eng", "eu": "eus", "fr": "fra", "it": "ita", "pt": "por", "de": "deu", "gl": "glg", "ja": "jpn"}
MODELS_DIR = Path(os.environ.get("NMT_MODELS", Path.home() / ".cache/softcatala-nmt"))
_loaded = {}

def model(pair):
    if pair in _loaded: return _loaded[pair]
    import ctranslate2, sentencepiece as spm
    d = MODELS_DIR / pair
    if not (d / "ctranslate2").exists():
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        z = MODELS_DIR / f"{pair}.zip"
        print(f"downloading model {MODELS[pair]} …", flush=True)
        urllib.request.urlretrieve(MODEL_URL.format(MODELS[pair]), z)
        with zipfile.ZipFile(z) as zf:
            for n in zf.namelist():
                parts = n.split("/")
                if len(parts) > 1 and parts[1] in ("ctranslate2", "tokenizer") and not n.endswith("/"):
                    out = d / "/".join(parts[1:]); out.parent.mkdir(parents=True, exist_ok=True)
                    with zf.open(n) as src, open(out, "wb") as dst: shutil.copyfileobj(src, dst)
        z.unlink()
    _loaded[pair] = (ctranslate2.Translator(str(d / "ctranslate2"), device="cpu", inter_threads=2),
                     spm.SentencePieceProcessor(model_file=str(d / "tokenizer" / "sp_m.model")))
    return _loaded[pair]

SYMBOL = re.compile(r"([\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F\u200D]+)")   # emoji runs: kept as they are
SENT = re.compile(r"(?<=[.!?…])\s+(?=[\"«“¿¡(<]?[A-ZÀ-ÖØ-Þ0-9])|(?<=[。！？])")   # LM: also Japanese full stops

def _raw(pair, sentences):
    tr, sp = model(pair)
    batch = [sp.encode(t, out_type=str) for t in sentences]
    res = tr.translate_batch(batch, beam_size=4, max_decoding_length=512)
    return [sp.decode(r.hypotheses[0]) for r in res]

def _fix_unknown(src, out):
    """The English model can't write some letters (e.g. á) and prints ⁇: copy those words from the source."""
    if "⁇" not in out: return out
    out = re.sub(r"\s*⁇\s*", "⁇", out)
    words = re.findall(r"[\w'’·-]+", src)
    def repl(m):
        tok = m.group(0)
        pat = re.compile("^" + ".+?".join(re.escape(x) for x in tok.split("⁇")) + "$")
        return next((w for w in words if pat.match(w)), tok.replace("⁇", ""))
    return re.sub(r"[\w'’·-]*⁇[\w'’·-]*", repl, out)

def translate_line(text, src, dst):
    """One line of plain text (no markdown): keeps emojis, names, {placeholders}, sentence by sentence."""
    if not text.strip(): return text
    lead, core, trail = re.match(r"^(\s*)(.*?)(\s*)$", text, re.S).groups()
    parts = SYMBOL.split(core)
    out = []
    for i, part in enumerate(parts):
        if i % 2 or not part.strip(): out.append(part); continue
        l2, mid, t2 = re.match(r"^(\s*)(.*?)(\s*)$", part, re.S).groups()
        holds = {}
        def hold(v):
            # LM: the Japanese model drops or rewrites "Zq0x" but keeps numbers, so it gets numeric placeholders
            k = f"{91001 + len(holds)}" if dst == "ja" else f"Zq{len(holds)}x"; holds[k] = v; return k
        # links and **bold**/*italic* are translated on their own and put back; addresses, {n}, 6 × 4… stay
        m = re.sub(r"\[([^\]]*)\](\([^)]*\))", lambda x: hold(f"[{translate_line(x.group(1), src, dst)}]{x.group(2)}"), mid)
        m = re.sub(r"(\*\*|__|\*)(?=\S)(.+?)(?<=\S)\1", lambda x: hold(f"{x.group(1)}{translate_line(x.group(2), src, dst)}{x.group(1)}"), m)
        m = re.sub(r"<[^>]+>", lambda x: hold(x.group(0)), m)   # LM: HTML tags stay as they are
        m = re.sub(r"\{\w+\}|\d+(?:[.,]\d+)?\s*[×x]\s*\d+(?:[.,]\d+)?|https?://[^\s)]+|`[^`]*`", lambda x: hold(x.group(0)), m)
        # VS: fixed terms and protected names travel as placeholders, so the model can't touch them
        for term in sorted(TERMS, key=lambda x: -len(x.get(src) or "")):
            if term.get(src) and term.get(dst): m = re.sub(rf"(?<!\w){re.escape(term[src])}(?!\w)", lambda x, v=term[dst]: hold(v), m)
        for k in KEEP:
            m = re.sub(rf"(?<!\w){re.escape(k)}(?!\w)", lambda x: hold(x.group(0)), m)
        sents = SENT.split(m)
        pair_path = [(src, dst)] if "ca" in (src, dst) else [(src, "ca"), ("ca", dst)]
        res = sents
        for a, b in pair_path:
            prev = res
            res = _raw(f"{CODE[a]}-{CODE[b]}", res)
            res = [_fix_unknown(p, r) for p, r in zip(prev, res)]
        t = ("" if dst == "ja" else " ").join(res)   # LM: Japanese has no spaces between sentences
        for k, v in holds.items():
            if k in t: t = t.replace(k, v)
            elif k.isdigit(): t = t + v   # LM
            else: t = re.sub(re.escape(k[:-1]) + r"\s*x?", v, t, flags=re.I) if re.search(re.escape(k[:-1]), t, re.I) else t + " " + v
        for k in KEEP:   # names must come out exactly as written
            if k in mid and k not in t:
                loose = re.compile(r"\s*".join(re.escape(w) for w in k.split()), re.I)
                t = loose.sub(k, t)
        out.append(l2 + t + t2)
    return lead + "".join(out) + trail

def translate_markdown(text, src, dst):
    """Line by line; list/heading/quote markers are kept, links keep their address (see translate_line)."""
    lines = []
    for line in text.split("\n"):
        prefix, rest = re.match(r"^(\s*(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+|>\s*)*)(.*)$", line).groups()
        lines.append(prefix + (translate_line(rest, src, dst) if rest.strip() else rest))
    return "\n".join(lines)

def translate(texts, src, dst):
    return [translate_markdown(t, src, dst) if "\n" in t else translate_line(t, src, dst) for t in texts]

# ---------- site texts ----------
def leaves(x, path=()):
    if isinstance(x, dict):
        for k, v in x.items(): yield from leaves(v, path + (k,))
    elif isinstance(x, list):
        for i, v in enumerate(x): yield from leaves(v, path + (i,))
    elif isinstance(x, str): yield path, x

def get(x, path):
    for p in path:
        try: x = x[p]
        except (KeyError, IndexError, TypeError): return None
    return x

def put(x, path, value):
    for p in path[:-1]: x = x[p]
    x[path[-1]] = value

def i18n(old_rev, dry):
    old, new, docs = {}, {}, {}
    is_json = I18N.endswith(".json")
    load = (lambda t: json.loads(t)) if is_json else (lambda t: YAML(typ="safe").load(t))
    for l in LANGS:
        p = I18N.format(lang=l)
        o = git_show(old_rev, p)
        old[l] = load(o) if o else {}
        docs[l] = json.loads((ROOT / p).read_text()) if is_json else yaml.load((ROOT / p).read_text())
        new[l] = load((ROOT / p).read_text())
    jobs = {}   # (src) -> list of path
    for path, _ in leaves(new[LANGS[0]]):
        if any(k in SKIP or str(k).startswith("_") for k in path): continue
        changed = [l for l in LANGS if get(new[l], path) != get(old[l], path)]
        if len(changed) == 1 and all(get(new[l], path) is not None for l in LANGS):
            jobs.setdefault(changed[0], []).append(path)
    done = []
    for src, paths in jobs.items():
        texts = [get(new[src], p) for p in paths]
        for dst in LANGS:
            if dst == src: continue
            if dst in NO_AUTO:   # LM
                done += [f"{'.'.join(map(str, p))}: {dst.upper()} still has the old text — translate it by hand" for p in paths]
                continue
            out = texts if dry else translate(texts, src, dst)
            for p, t in zip(paths, out):
                if not dry: put(docs[dst], p, t if is_json else DQ(t))
                done.append(f"{'.'.join(map(str, p))}: {src.upper()} → {dst.upper()}")
    if not dry:
        for l in LANGS:
            p = ROOT / I18N.format(lang=l)
            if is_json:
                txt = p.read_text(); ind = (re.search(r'\n( +|\t)"', txt) or [None, "  "])[1]
                p.write_text(json.dumps(docs[l], ensure_ascii=False, indent=ind) + ("\n" if txt.endswith("\n") else ""))
            else:
                buf = StringIO(); yaml.dump(docs[l], buf); p.write_text(buf.getvalue())
    return done

# ---------- simple pages ----------
FM_KEYS = ["title", "intro", "image_alt", "description"]
def split_md(s):
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", s or "", re.S)
    return (YAML(typ="safe").load(m.group(1)) or {}, m.group(2)) if m else ({}, s or "")

def join_md(fm, body):
    buf = StringIO(); y = YAML(); y.width = 10_000
    y.dump({k: (DQ(v) if isinstance(v, str) else v) for k, v in fm.items()}, buf)
    return f"---\n{buf.getvalue()}---\n{body}"

def pages(old_rev, dry):
    if not PAGES: return []
    folder = lambda l: PAGES.format(lang=l)
    names = {f.stem for l in LANGS for f in (ROOT / folder(l)).glob("*.md")}
    done = []
    for n in sorted(names):
        cur = {l: (ROOT / f"{folder(l)}/{n}.md").read_text() if (ROOT / f"{folder(l)}/{n}.md").exists() else None for l in LANGS}
        before = {l: git_show(old_rev, f"{folder(l)}/{n}.md") for l in LANGS}
        changed = [l for l in LANGS if cur[l] is not None and cur[l] != before[l]]
        if len(changed) != 1: continue
        src = changed[0]
        if any(cur[l] is not None and before[l] is not None and cur[l] != before[l] for l in LANGS if l != src): continue
        fm, body = split_md(cur[src])
        texts = [fm[k] for k in FM_KEYS if isinstance(fm.get(k), str) and fm[k].strip()] + ([body] if body.strip() else [])
        for dst in LANGS:
            if dst == src: continue
            out = texts if dry else translate(texts, src, dst)
            dfm, _ = split_md(cur[dst]) if cur[dst] else ({}, "")
            nfm = dict(fm); nfm.update({k: v for k, v in dfm.items() if k not in FM_KEYS})  # keep the other page's own image etc.
            i = 0
            for k in FM_KEYS:
                if isinstance(fm.get(k), str) and fm[k].strip(): nfm[k] = out[i]; i += 1
            nbody = out[i] if body.strip() else ""
            if not dry:
                (ROOT / folder(dst)).mkdir(parents=True, exist_ok=True)
                (ROOT / f"{folder(dst)}/{n}.md").write_text(join_md(nfm, nbody))
            done.append(f"page {n}: {src.upper()} → {dst.upper()}")
    return done

if __name__ == "__main__":
    if "--download" in sys.argv:          # fetch all models once (the workflow caches them)
        need = {"spa-cat", "eng-cat"} | {f"cat-{CODE[l]}" for l in LANGS if l not in ("ca", *NO_AUTO)}   # LM: other sources load when used
        for pair in sorted(need & set(MODELS)): model(pair)
        raise SystemExit(0)
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    if not args: raise SystemExit(__doc__)
    old = args[0]
    done = i18n(old, dry) + pages(old, dry)
    print("\n".join(done) or "Nothing to translate.")
    Path(os.environ.get("TRANSLATED_LIST", "/dev/null")).write_text("\n".join(done))
