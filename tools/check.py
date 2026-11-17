#!/usr/bin/env python3
"""Check the site's content before pushing → CHECK-REPORT.md

  python3 tools/check.py                 full report (exit code 1 if there are problems)
  python3 tools/check.py --find "text"   every content file / built page that contains "text"

  1. Languages: text keys missing per language (es is the reference)
  2. Names and pronouns: wrong spellings and banned forms (content/facts.json)
  3. Files: photos, posters and PDFs used in content/*.json that don't exist
  4. Private data: this repo is PUBLIC — no bank accounts, ID numbers or concert fees
Adapted from ciaVENDAVAL/victoriasickness-web/tools/check.py."""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
C = ROOT / "content"
facts = json.loads((C / "facts.json").read_text(encoding="utf-8"))
site = json.loads((C / "site.json").read_text(encoding="utf-8"))
LANGS = site["languages"]


def sources():
    for p in sorted(C.rglob("*.json")):
        if p.name != "facts.json":
            yield str(p.relative_to(ROOT)), p.read_text(encoding="utf-8")
    for p in sorted((ROOT / "_site").rglob("index.html")) if (ROOT / "_site").exists() else []:
        if "/admin/" not in str(p):
            yield str(p.relative_to(ROOT)), re.sub(r"<script.*?</script>|<[^>]+>", " ", p.read_text(encoding="utf-8"), flags=re.S)


def flat(d):
    return {k: v for g in d.values() for k, v in g.items()}


def main():
    if "--find" in sys.argv:
        q = sys.argv[sys.argv.index("--find") + 1].lower()
        for label, text in sources():
            n = text.lower().count(q)
            if n:
                print(f"{n:3}× {label}")
        return 0
    out = ["# CHECK-REPORT", ""]
    # 1. languages
    out += ["## 1. Languages", ""]
    i18n = {l: flat(json.loads((C / "i18n" / f"{l}.json").read_text(encoding="utf-8"))) for l in LANGS if (C / "i18n" / f"{l}.json").exists()}
    for l in LANGS:
        if l not in i18n:
            out.append(f"- ❌ no content/i18n/{l}.json")
    ref = i18n["es"]
    for l, d in i18n.items():
        miss = [k for k in ref if not d.get(k)]
        if miss:
            out.append(f"- ⚠ {l}: {len(miss)} text(s) missing (shown in castellano): {', '.join(miss[:12])}{' …' if len(miss) > 12 else ''}")
        for k, v in d.items():
            if k in ref and v.count("<") != ref[k].count("<"):
                out.append(f"- ⚠ {l}: «{k}» has different HTML marks than castellano (auto-translation?)")
    # 2. names, banned forms
    out += ["", "## 2. Names and pronouns", ""]
    for label, text in sources():
        m = re.search(r"i18n/([a-z]{2})\.json$|_site/([a-z]{2})/", label)
        lang = (m.group(1) or m.group(2)) if m else ("es" if label.startswith("_site/") else None)
        for right, wrongs in facts.get("names", {}).items():
            for w in wrongs:
                if re.search(r"(?<![\w])" + re.escape(w) + r"(?![\w])", text):
                    out.append(f'- ❌ {label}: "{w}" → {right}')
        for w in facts.get("banned", {}).get("*", []) + (facts.get("banned", {}).get(lang, []) if lang else []):
            if re.search(r"(?<![\w])" + re.escape(w) + r"(?![\w])", text, re.I):
                out.append(f'- ❌ {label}: "{w}" (pronouns: Hipogrifa she · Victoria Sickness and Contàmina Perpétua they)')
    # 3. files
    out += ["", "## 3. Files", ""]
    for p in sorted(C.glob("*.json")):
        for m in re.finditer(r'"(/?assets/[^"]+)"', p.read_text(encoding="utf-8")):
            if not (ROOT / m.group(1).lstrip("/")).exists():
                out.append(f"- ❌ {p.name}: {m.group(1)} does not exist")
    for p in (ROOT / "assets").rglob("*.pdf"):
        if p.stat().st_size > 8e6:
            out.append(f"- ⚠ {p.relative_to(ROOT)} is {p.stat().st_size / 1e6:.1f} MB (heavy for phones)")
    # 4. private data
    out += ["", "## 4. Private data (public repo!)", ""]
    for label, text in sources():
        for rule in facts.get("private", []):
            for m in re.finditer(rule["pattern"], text):
                out.append(f'- ❌ {label}: {rule["why"]} → "{m.group(0)}"')
    problems = sum(1 for x in out if x.startswith("- ❌"))
    out.insert(1, f'{problems} problem(s), {sum(1 for x in out if x.startswith("- ⚠"))} warning(s).\n')
    (ROOT / "CHECK-REPORT.md").write_text("\n".join(out) + "\n", encoding="utf-8")
    print("\n".join(out))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
