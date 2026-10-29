# Translation task: Las Marikarmen lyrics (queer / travesti band, Barcelona)

Input: in/groupN.txt (your group). Each song lists blocks as "--- block B (n lines)" followed by "i| line".
Blocks marked "identical ... skip" or empty/hr/list: do nothing (reused automatically).

For EVERY listed block, produce segments. A segment = a run of consecutive lines in ONE language
(lang: "es" | "en" | "eu" | "ru" | "ca" | "other"). Split a block into several segments when languages mix
(e.g. Spanish + English lines, Basque lines). Segments of a block must cover all lines, in order, no overlap.
Lines that are just credits/labels (e.g. "*Las Marikarmen*", "*prod. Carlo Jurancelli*", "**[Grieta]**", "[Oli]" singer labels,
"(Soft crying)" stage notes may be translated but singer/credit names never) -> make them their own segment with
"skip": true and no translations. Speaker tags like "[Scarlot Harlot] text": keep the tag unchanged in every
version and translate only the text after it. Keep a trailing line like "Lady lady lady boi" untranslated if it is pure sound/wordplay on an English term; use "keep": true meaning copy the original line into all versions.

For each non-skip segment give translations into the THREE target languages EXCEPT the segment's own language:
  "en" (English), "es" (castellano, peninsular Spain), "eu" (euskara, batua). 
  A segment already in "es" gets only en and eu (es: null). English segment gets es and eu. Basque gets en and es. Russian/other gets all three
  (a Russian line may be followed in the source by a {Spanish gloss}: keep the gloss in the segment).
Each translation is an array of strings with EXACTLY as many entries as the segment has lines (line-for-line, same order).
Empty lines stay empty strings.

STYLE (important): keep the JARGON. The originals are slangy, phonetic Spanish (k for qu, x for ch, dropped s/d, "tol", "kerida",
"cuerpa", "monstrua", "bichas", "marika", "trabolo", inclusive -e/-es endings like "nosotres", "queride"), queer slang, puns, sexual and
political language. Do NOT sanitize, do NOT formalise, do NOT soften. Translate meaning + register + attitude, and reproduce wordplay
with equivalent slang, keeping a similar rhythm/length per line where possible. In English use real queer/street/ballroom slang, in
castellano use colloquial peninsular queer slang (not neutral textbook Spanish; keep the phonetic playful spelling flavour where it works
e.g. "tol", "ke"), in euskara use colloquial/spoken register (hika not needed) with Basque queer/neologism usage where natural
(e.g. "marikoi", "bollera", "trabesti"). Keep inclusive gender (-e/-es in es). Keep proper names, brand names, song titles,
singer labels unchanged. Keep exclamations/sound words (tukutu, riiii) as is.
When you must pick between meanings, pick the one that fits the band's politics (transfeminist, anti-cis-heteropatriarchy,
sex-worker solidarity, anti-gentrification, pro Palestine solidarity in "Alunizaje").

If a line is genuinely ambiguous, an untranslatable pun, or you are unsure: still give your best translation AND add an entry to the
song's "questions" array: {"block":B,"line":i,"original":"...","issue":"short explanation in English"}. Be honest, do not hide doubt.
Do NOT invent lyrics. Do NOT alter the original text; copy lines exactly in "orig" (used for a validation check).

OUTPUT: one JSON file per song at the path given in its header, UTF-8, valid JSON:
{
 "song": "<title>",
 "blocks": [
   {"block": B, "segments": [
      {"from": 0, "to": 3, "lang": "es", "skip": false, "keep": false,
       "orig": ["line0","line1","line2","line3"],
       "en": ["...","...","...","..."], "es": null, "eu": ["...","...","...","..."]}
   ]}
 ],
 "questions": []
}
"from"/"to" are inclusive line indexes inside the block. Skipped segments: "skip": true, "en"/"es"/"eu": null.
After writing each file validate it with: python3 -I -c "import json;json.load(open('PATH'))" and check every translated
array has the same length as orig. Work only in /tmp/claude-0/-home-claude/163d9bea-2dcd-588f-b44f-c8138ccfda05/scratchpad/work.
Final reply: just the list of files written and the total number of questions (no other text).
