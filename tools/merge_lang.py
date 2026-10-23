#!/usr/bin/env python3
"""Merge a one-language file into content/text.yaml (the master).

    python3 tools/merge_lang.py fr translations-fr.yaml            fill only missing fr lines
    python3 tools/merge_lang.py fr translations-fr.yaml --replace  also replace existing fr lines

The language file is plain YAML:  key: text
Comments and order in text.yaml are kept; languages are written in the order below.
To hand a translator one language: python3 tools/merge_lang.py --export fr > fr.yaml
"""
import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
MASTER = ROOT / "content" / "text.yaml"
ORDER = ["es", "en", "ca", "gl", "eu", "pt", "fr", "it", "de", "ja"]
KEY_RE = re.compile(r"^([A-Za-z0-9_]+):\s*(\{.*\})?\s*$")
LANG_RE = re.compile(r"^  ([a-z]{2}):\s?(.*)$")


def read_blocks():
    """Return a list of items: ('raw', line) or ('key', name, {lang: raw_value})."""
    items, cur = [], None
    for line in MASTER.read_text(encoding="utf-8").splitlines():
        m = KEY_RE.match(line)
        if m:
            vals = {}
            if m.group(2):  # flow style  key: {es: x}
                for lang, val in yaml.safe_load(m.group(2)).items():
                    vals[lang] = json.dumps(val, ensure_ascii=False)
            cur = ("key", m.group(1), vals)
            items.append(cur)
            continue
        lm = LANG_RE.match(line)
        if lm and cur:
            cur[2][lm.group(1)] = lm.group(2)
            continue
        cur = None
        items.append(("raw", line))
    return items


def write_blocks(items):
    out = []
    for it in items:
        if it[0] == "raw":
            out.append(it[1])
            continue
        _, key, vals = it
        out.append(f"{key}:")
        for lang in ORDER + sorted(set(vals) - set(ORDER)):
            if lang in vals:
                out.append(f"  {lang}: {vals[lang]}")
    MASTER.write_text("\n".join(out).rstrip("\n") + "\n", encoding="utf-8")


def main():
    args = sys.argv[1:]
    if args[:1] == ["--export"]:
        lang = args[1]
        data = yaml.safe_load(MASTER.read_text(encoding="utf-8"))
        for k, v in data.items():
            src = (v or {}).get("es", "")
            cur = (v or {}).get(lang, "")
            print(f"# es: {src}")
            print(f"{k}: {json.dumps(cur, ensure_ascii=False)}")
        return
    lang, path = args[0], args[1]
    replace = "--replace" in args
    new = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}
    items = read_blocks()
    known = {it[1]: it for it in items if it[0] == "key"}
    added = replaced = 0
    for k, v in new.items():
        if v in (None, ""):
            continue
        if k not in known:
            print(f"  ! {k} is not in text.yaml (skipped)")
            continue
        vals = known[k][2]
        if lang in vals and not replace:
            continue
        replaced += lang in vals
        added += lang not in vals
        vals[lang] = json.dumps(str(v), ensure_ascii=False)
    write_blocks(items)
    print(f"{lang}: {added} added, {replaced} replaced")


if __name__ == "__main__":
    main()
