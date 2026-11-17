/* Edit on the page — copied from Victoria Sickness (ciaVENDAVAL/victoriasickness-web/src/edit.js, itself from La Senyal)
   for lasmarikarmen-web. Settings are in the loader at the end of templates/base.html (window.LS_EDIT).
   Las Marikarmen: photos and PDFs are written where they are served (assets/…), so img.repo / pdf.repo are not set;
   the workflow then translates, builds and publishes (3–5 minutes). Changes against VS are marked "LM:".
   Open any page with #edit at the end of the address (or the "Edit on the page" button in the admin).
   Tap a text to change it, tap a photo or a PDF link to replace it, then "Publish".
   Saves straight to GitHub (ciaVENDAVAL/lasenyal-web, main) in one commit; the site updates in 1–2 minutes.
   Texts are matched to the YAML files in _data/ by their exact wording, so nothing in the templates
   needs to be marked. Loaded only in edit mode (see the loader at the end of _layouts/default.html). */
import { parseDocument, isScalar } from "https://cdn.jsdelivr.net/npm/yaml@2.9.1/browser/index.js";

/* Settings: every site sets window.LS_EDIT before loading this file (see the loader in _layouts/default.html).
   Only repo, base and lang are needed; the rest has defaults that fit a Jekyll site like lasenyal-web.
     repo      "owner/name" of the site's GitHub repo        branch   "main"
     base      the site's baseurl ("" or "/name")            lang     language of this page ("ca", "es", "en"…)
     files     data files whose texts become editable; "{lang}" = this page's language. YAML (.yml) or JSON (.json)
     skip      keys never edited as text (paths, links, dates…)
     img       { root, small, large }: images under root are replaceable; a small copy maps to its large original
     pdf       { downloads, name, short } or null: the file that says which PDF each short link gives,
               the name for a new PDF ({LANG} {lang} {kind} {yyyy-mm}) and the short link pattern
     admin     link shown when asking for the token
   VS: img.repo  folder where a replaced photo is written (source-images/<name>.jpg) instead of the served path
   VS: pdf.repo  prefix for new PDFs in the repo ("static" → static/pdf/…); pdf.short may contain {kind} */
const CFG = Object.assign({
  repo: "ciaVENDAVAL/lasenyal-web", branch: "main", base: "", lang: "es",
  files: ["_data/i18n/{lang}.yml", "_data/members.yml", "_data/concerts.yml", "_data/site.yml", "_data/gallery.yml", "_data/downloads.yml"],
  skip: ["photo", "f", "o", "map", "link", "role", "date", "end", "time", "residency", "label", "instagram", "video", "rhythms", "images"],
  img: { root: "/assets/img/", small: "/assets/img/sm/", large: "/assets/img/lg/" },
  pdf: { downloads: "_data/downloads.yml", name: "/pdf/LaSenyal_{LANG}_{kind}_{yyyy-mm}.pdf", short: "/dossier/{lang}/" },
  admin: "https://ciavendaval.github.io/lasenyal-admin/",
}, window.LS_EDIT || {});
const API = "https://api.github.com/repos/" + CFG.repo;
const LANG_UP = CFG.lang.toUpperCase();
const SKIP_KEYS = new Set(CFG.skip);
const TEXT_FILES = () => CFG.files.map(f => f.replace("{lang}", CFG.lang));
const DL = CFG.pdf && CFG.pdf.downloads;
/* YAML keeps its comments and quotes; JSON keeps its indentation */
const isJson = f => f.endsWith(".json");
const parse = (f, text) => isJson(f) ? JSON.parse(text) : parseDocument(text).toJS();
function rewrite(file, text, edits) {
  if (isJson(file)) {
    const data = JSON.parse(text), indent = (text.match(/\n( +|\t)"/) || [, "  "])[1];
    for (const e of edits) { let o = data; for (const k of e.path.slice(0, -1)) o = o[k]; o[e.path.at(-1)] = e.value; }
    return JSON.stringify(data, null, indent) + (text.endsWith("\n") ? "\n" : "");
  }
  const doc = parseDocument(text);
  for (const e of edits) {
    const node = doc.getIn(e.path, true);
    if (isScalar(node)) { node.value = e.value; node.type = "QUOTE_DOUBLE"; } else doc.setIn(e.path, e.value);
  }
  return doc.toString({ lineWidth: 0 });
}

const T_ALL = {
  ca: { bar: "Editant", changes: n => n === 1 ? "1 canvi" : `${n} canvis`, publish: "Publica", exit: "Surt", photos: "Fotos", help: "Toca un text per canviar-lo. Toca una foto o un enllaç PDF per substituir-lo. Després, «Publica».", tokenTitle: "Inicia sessió", tokenText: "Enganxa el teu token de GitHub (el mateix de l'admin).", save: "Desa", cancel: "Cancel·la", replacePhoto: "Tria una foto nova", replacePdf: "Tria un PDF nou", usedIn: "S'usa a", photoNote: "La foto nova substitueix aquesta a tot el web (mateix nom de fitxer). La còpia petita es fa sola.", pdfNote: "El PDF nou es desa com a", places: "Aquest text és a diversos llocs. Canvia'l a:", publishing: "Publicant…", published: "Publicat! Es veurà al web en 3–5 minuts.", error: "No s'ha pogut publicar", leave: "Tens canvis sense publicar.", none: "Res a publicar.", close: "Tanca", noPhotos: "No hi ha fotos en aquesta pàgina.", translate: "Tradueix", translateHint: "Els textos canviats en un idioma es tradueixen sols als altres (traductor lliure de Softcatalà). Desmarca-ho per corregir només aquest idioma.", translating: "Els altres idiomes es tradueixen sols en uns minuts." },
  es: { bar: "Editando", changes: n => n === 1 ? "1 cambio" : `${n} cambios`, publish: "Publicar", exit: "Salir", photos: "Fotos", help: "Toca un texto para cambiarlo. Toca una foto o un enlace PDF para sustituirlo. Después, «Publicar».", tokenTitle: "Iniciar sesión", tokenText: "Pega tu token de GitHub (el mismo del admin).", save: "Guardar", cancel: "Cancelar", replacePhoto: "Elegir foto nueva", replacePdf: "Elegir PDF nuevo", usedIn: "Se usa en", photoNote: "La foto nueva sustituye a esta en toda la web (mismo nombre de archivo). La copia pequeña se hace sola.", pdfNote: "El PDF nuevo se guarda como", places: "Este texto está en varios sitios. Cámbialo en:", publishing: "Publicando…", published: "¡Publicado! Se verá en la web en 3–5 minutos.", error: "No se ha podido publicar", leave: "Tienes cambios sin publicar.", none: "Nada que publicar.", close: "Cerrar", noPhotos: "No hay fotos en esta página.", translate: "Traducir", translateHint: "Los textos cambiados en un idioma se traducen solos a los demás (traductor libre de Softcatalà). Desmárcalo para corregir solo este idioma.", translating: "Los otros idiomas se traducen solos en unos minutos." },
  en: { bar: "Editing", changes: n => n === 1 ? "1 change" : `${n} changes`, publish: "Publish", exit: "Exit", photos: "Photos", help: "Tap a text to change it. Tap a photo or a PDF link to replace it. Then “Publish”.", tokenTitle: "Sign in", tokenText: "Paste your GitHub token (the same one as in the admin).", save: "Save", cancel: "Cancel", replacePhoto: "Choose a new photo", replacePdf: "Choose a new PDF", usedIn: "Used in", photoNote: "The new photo replaces this one everywhere on the site (same file name). The small copy is made automatically.", pdfNote: "The new PDF is saved as", places: "This text is in several places. Change it in:", publishing: "Publishing…", published: "Published! It will show on the site in 3–5 minutes.", error: "Could not publish", leave: "You have unpublished changes.", none: "Nothing to publish.", close: "Close", noPhotos: "No photos on this page.", translate: "Translate", translateHint: "Texts changed in one language are translated into the others (Softcatalà open translator). Untick to fix only this language.", translating: "The other languages are translated automatically in a few minutes." },
};
const T = T_ALL[CFG.lang] || T_ALL.es;   // VS: eu fr it pt de use the Spanish editor labels

/* ---------- state ---------- */
const sources = {};          // file -> { text, data }
const textIndex = new Map(); // normalised text -> [{file, path}]
const textEdits = new Map(); // "file\u0000json(path)" -> {file, path, value}
const binEdits = new Map();  // repo path -> {file: File, url}
let token = null;

const norm = s => String(s).replace(/\s+/g, " ").trim();
const key = (file, path) => file + "\u0000" + JSON.stringify(path);
const repoPath = url => {
  let p = new URL(url, location.href).pathname;
  if (CFG.base && p.startsWith(CFG.base + "/")) p = p.slice(CFG.base.length);
  return decodeURIComponent(p);
};
const count = () => textEdits.size + binEdits.size;

/* ---------- pending changes survive moving to another page or language (until Publish or Exit) ---------- */
const PENDING = "ls-edit-pending";
function saveTexts() { try { sessionStorage.setItem(PENDING, JSON.stringify([...textEdits.values()])); } catch (e) {} }
function idb() {
  return new Promise((res, rej) => { const r = indexedDB.open("ls-edit", 1); r.onupgradeneeded = () => r.result.createObjectStore("files"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
async function idbDo(fn) { try { const db = await idb(); return await new Promise((res, rej) => { const tx = db.transaction("files", "readwrite"); const st = tx.objectStore("files"); const out = fn(st); tx.oncomplete = () => res(out && out.result); tx.onerror = () => rej(tx.error); }); } catch (e) { console.warn("edit: storage", e); } }
const saveBin = (path, file) => idbDo(st => st.put(file, path));
const clearPending = () => { try { sessionStorage.removeItem(PENDING); } catch (e) {} return idbDo(st => st.clear()); };
async function restorePending() {
  try { for (const e of JSON.parse(sessionStorage.getItem(PENDING) || "[]")) textEdits.set(key(e.file, e.path), e); } catch (e) {}
  for (const s of spans) {
    const hit = s.candidates.map(c => textEdits.get(key(c.file, c.path))).find(Boolean);
    if (hit) { s.span.textContent = hit.value; s.value = hit.value; s.span.classList.add("ls-changed"); }
  }
  const paths = await idbDo(st => st.getAllKeys()) || [];
  for (const p of paths) { const f = await idbDo(st => st.get(p)); if (f) { binEdits.set(p, { file: f, url: URL.createObjectURL(f) }); showBin(p); } }
}
function showBin(path) {
  const { url } = binEdits.get(path), name = path.split("/").pop();
  if (/\.pdf$/i.test(path)) { document.querySelectorAll("a.ls-pdf").forEach(a => { const i = pdfInfo(a); if (i && textEdits.get(key(DL, [i.kind, i.lang]))?.value === path) { a.classList.add("ls-changed"); a.dataset.lsNew = url; } }); return; }
  document.querySelectorAll("img").forEach(i => { if ((i.currentSrc || i.src).split("/").pop().split("?")[0] === name) { i.src = url; i.srcset = ""; i.classList.add("ls-changed"); } });
  document.querySelectorAll("[data-lg], a[href]").forEach(a => { if ((a.dataset.lg || "").endsWith("/" + name)) a.dataset.lg = url; if (a.getAttribute("href")?.endsWith("/" + name)) a.href = url; });
}
// a text span's edit goes to the places ticked for it
function applySpan(s) {
  for (const k of s.keys || []) textEdits.delete(k);
  s.keys = [];
  if (s.changed) for (const c of s.chosen) { const k = key(c.file, c.path); textEdits.set(k, { file: c.file, path: c.path, value: s.value }); s.keys.push(k); }
  saveTexts();
}
const translateOn = () => { try { return sessionStorage.getItem("ls-edit-translate") !== "0"; } catch (e) { return true; } };

/* ---------- GitHub ---------- */
function getToken() {
  try { const u = JSON.parse(localStorage.getItem("sveltia-cms.user") || "null"); if (u && u.token) return u.token; } catch (e) {}
  try { return localStorage.getItem("ls-edit-token"); } catch (e) { return null; }
}
async function gh(path, opts = {}) {
  const r = await fetch(API + path, { ...opts, headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  return r;
}
async function headSha() { return (await (await gh(`/git/ref/heads/${CFG.branch}`)).json()).object.sha; }
async function readFile(path, ref) {
  const r = await gh(`/contents/${encodeURI(path)}?ref=${ref}`, { headers: { Accept: "application/vnd.github.raw+json" } });
  return r.text();
}
const b64text = s => { const b = new TextEncoder().encode(s); let x = ""; for (let i = 0; i < b.length; i += 0x8000) x += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(x); };
const b64file = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(f); });

/* ---------- load the data files and index their texts ---------- */
function walk(x, path, file) {
  if (Array.isArray(x)) x.forEach((v, i) => walk(v, [...path, i], file));
  else if (x && typeof x === "object") { for (const [k, v] of Object.entries(x)) if (!SKIP_KEYS.has(k)) walk(v, [...path, k], file); }
  else if (typeof x === "string") {
    const t = norm(x);
    if (t.length < 2 || /^(https?:|mailto:|\/|#|[\w.-]+\.(jpe?g|png|webp|pdf)$)/i.test(t)) return;
    if (/\{[a-z]\}/.test(t)) return; // templates with {n}, {i}: filled in by scripts
    if (!textIndex.has(t)) textIndex.set(t, []);
    textIndex.get(t).push({ file, path });
  }
}
async function load() {
  const sha = await headSha();
  await Promise.all(TEXT_FILES().map(async f => {
    try { const text = await readFile(f, sha); sources[f] = { text, data: parse(f, text) }; } catch (e) { console.warn("edit: cannot read", f, e); }
  }));
  for (const [f, s] of Object.entries(sources)) walk(s.data, [], f);
}

/* ---------- mark texts, photos, PDF links ---------- */
const UI_SEL = "#ls-edit-ui, script, style, noscript, template, svg";
const spans = [];
function markTexts() {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement && !n.parentElement.closest(UI_SEL) && norm(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
  const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  for (const n of nodes) {
    const t = norm(n.nodeValue);
    let match = textIndex.get(t), value = t, tail = "";
    let head = "";
    if (!match) {   // allow decorations around the text: "/ La banda /", "Press kit ↓", "Contact:"
      const m = t.match(/^([\/·*→←\s]*)(.*?)([\s\/·↓→←↑↗▾*:\d%]*)$/);
      if (m && textIndex.get(norm(m[2]))) { head = m[1]; value = norm(m[2]); tail = m[3]; match = textIndex.get(value); }
    }
    if (!match) continue;
    const span = document.createElement("span");
    span.className = "ls-t"; span.textContent = value;
    span.dataset.lsIdx = spans.length;
    const lead = n.nodeValue.match(/^\s*/)[0];
    const frag = document.createDocumentFragment();
    if (lead || head) frag.append(lead + head);
    frag.append(span);
    if (tail) frag.append(tail.startsWith(" ") ? tail : " " + tail.trim());
    n.replaceWith(frag);
    spans.push({ span, candidates: match, chosen: match.slice(), value });
    try { span.contentEditable = "plaintext-only"; if (span.contentEditable !== "plaintext-only") span.contentEditable = "true"; } catch (e) { span.contentEditable = "true"; }
    span.spellcheck = true;
    span.addEventListener("focus", () => onFocusText(spans[span.dataset.lsIdx]));
    span.addEventListener("blur", () => onBlurText(spans[span.dataset.lsIdx]));
    span.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); span.blur(); } if (e.key === "Escape") { span.textContent = spans[span.dataset.lsIdx].value; span.blur(); } });
  }
}
const imgPath = img => {
  const p = repoPath(img.currentSrc || img.src);
  if (!p.startsWith(CFG.img.root)) return null;
  const q = CFG.img.small && CFG.img.large ? p.replace(CFG.img.small, CFG.img.large) : p;
  return CFG.img.repo ? CFG.img.repo + q.split("/").pop() : q;   // VS: the original lives in source-images/
};
function markMedia() {
  document.querySelectorAll("img").forEach(img => { if (!img.closest(UI_SEL) && imgPath(img)) img.classList.add("ls-img"); });
  document.querySelectorAll("a[href]").forEach(a => {
    if (!pdfInfo(a)) return;
    a.classList.add("ls-pdf");
    a.querySelectorAll(".ls-t").forEach(t => { t.contentEditable = "false"; t.classList.add("ls-in-pdf"); });
  });
}
function pdfInfo(a) {
  const p = repoPath(a.href);
  if (!DL) return null;
  const dl = sources[DL]?.data || {};
  for (const [kind, per] of Object.entries(dl)) for (const [lang, f] of Object.entries(per || {})) {
    if (p === f || (CFG.pdf.short && (CFG.pdf.short.includes("{kind}") || kind === "presskit") && p === CFG.pdf.short.replace("{lang}", lang).replace("{kind}", kind))) return { kind, lang, current: f };
  }
  return null;
}

/* ---------- text editing ---------- */
const label = c => `${c.file.replace("_data/", "").replace("content/", "").replace(/\.(yml|json)$/, "")} › ${c.path.join(" › ")}`;
function onFocusText(s) {
  s.span.classList.add("ls-on");
  if (s.candidates.length > 1) showPlaces(s); else hidePlaces();
}
function onBlurText(s) {
  s.span.classList.remove("ls-on");
  const v = norm(s.span.textContent);   // not innerText: CSS uppercase would be saved
  if (!v) { s.span.textContent = s.value; return; }
  if (v === s.value) return;
  s.value = v; s.changed = true; s.span.classList.add("ls-changed");
  applySpan(s); mirror(s); update();
}
// show the new text in the other spots that use the same chosen places (the places are decided at Publish)
const same = (a, b) => a.file === b.file && JSON.stringify(a.path) === JSON.stringify(b.path);
function mirror(s) {
  for (const o of spans) {
    if (o === s || o.changed) continue;
    const hit = s.changed && o.candidates.some(x => s.chosen.some(c => same(c, x)));
    o.span.textContent = hit ? s.value : o.value;
    o.span.classList.toggle("ls-changed", hit);
  }
}
let placesBox;
function showPlaces(s) {
  hidePlaces();
  placesBox = el("div", { class: "ls-places" }, [el("p", {}, T.places)]);
  s.candidates.forEach(c => {
    const cb = el("input", { type: "checkbox" }); cb.checked = s.chosen.includes(c);
    cb.addEventListener("change", () => { s.chosen = s.candidates.filter((x, i) => placesBox.querySelectorAll("input")[i].checked); if (!s.chosen.length) { s.chosen = [c]; cb.checked = true; } applySpan(s); mirror(s); update(); });
    cb.addEventListener("mousedown", e => e.preventDefault());
    placesBox.append(el("label", {}, [cb, " " + label(c)]));
  });
  placesBox.style.bottom = (ui.querySelector(".ls-bar").offsetHeight + 8) + "px";
  ui.append(placesBox);
}
function hidePlaces() { placesBox?.remove(); placesBox = null; }

/* ---------- photo and PDF dialogs ---------- */
function usedIn(path) {
  const name = path.split("/").pop(), out = [];
  for (const [f, s] of Object.entries(sources)) if (s.text.includes(name)) out.push(f.replace("_data/", ""));
  return out;
}
function photoDialog(img) {
  const path = imgPath(img);
  const pending = binEdits.get(path);
  const input = el("input", { type: "file", accept: "image/*", hidden: "" });
  const prev = el("img", { src: pending ? pending.url : img.currentSrc || img.src, alt: "" });
  const d = dialog([
    el("h2", {}, path.split("/").pop()), prev,
    el("p", { class: "ls-small" }, `${T.usedIn}: ${usedIn(path).join(", ") || "—"}. ${T.photoNote}`),
    el("div", { class: "ls-row" }, [btn(T.replacePhoto, () => input.click(), true), btn(T.close, () => d.close())]), input,
  ]);
  input.addEventListener("change", () => {
    const f = input.files[0]; if (!f) return;
    binEdits.set(path, { file: f, url: URL.createObjectURL(f) }); saveBin(path, f);
    showBin(path); update(); d.close();
  });
}
function pdfDialog(a) {
  const info = pdfInfo(a);
  const stamp = new Date().toISOString().slice(0, 7);
  const target = CFG.pdf.name.replaceAll("{LANG}", info.lang.toUpperCase()).replaceAll("{lang}", info.lang).replaceAll("{kind}", info.kind).replaceAll("{yyyy-mm}", stamp);   // LM: replaceAll ({kind} twice)
  const input = el("input", { type: "file", accept: "application/pdf,.pdf", hidden: "" });
  const span = a.querySelector(".ls-t"), s = span && spans[span.dataset.lsIdx];
  const textBox = s ? el("input", { type: "text", value: s.value, "aria-label": "text" }) : null;
  const saveText = () => { if (s && norm(textBox.value) && norm(textBox.value) !== s.value) { span.textContent = norm(textBox.value); onBlurText(s); } };
  const d = dialog([
    el("h2", {}, `${info.kind} · ${info.lang.toUpperCase()}`),
    ...(textBox ? [textBox] : []),
    el("p", {}, [el("a", { href: a.dataset.lsNew || a.href, target: "_blank", rel: "noopener" }, info.current.split("/").pop())]),
    el("p", { class: "ls-small" }, `${T.pdfNote} ${target.split("/").pop()}.` + (CFG.pdf.short ? ` Short link: ${CFG.pdf.short.replace("{lang}", info.lang).replace("{kind}", info.kind)}` : "")),
    el("div", { class: "ls-row" }, [btn(T.replacePdf, () => input.click(), true), btn(T.close, () => d.close())]), input,
  ]);
  d.addEventListener("close", saveText);
  input.addEventListener("change", () => {
    const f = input.files[0]; if (!f) return;
    binEdits.set(target, { file: f, url: URL.createObjectURL(f) }); saveBin(target, f);
    textEdits.set(key(DL, [info.kind, info.lang]), { file: DL, path: [info.kind, info.lang], value: target }); saveTexts();
    showBin(target); update(); d.close();
  });
}
function photosDialog() {
  const imgs = [...document.querySelectorAll("img.ls-img")];
  const seen = new Set(), grid = el("div", { class: "ls-grid" });
  imgs.forEach(i => { const p = imgPath(i); if (seen.has(p)) return; seen.add(p); const t = el("img", { src: i.currentSrc || i.src, alt: p.split("/").pop(), title: p }); t.addEventListener("click", () => { d.close(); photoDialog(i); }); grid.append(t); });
  const d = dialog([el("h2", {}, T.photos), seen.size ? grid : el("p", {}, T.noPhotos), el("div", { class: "ls-row" }, [btn(T.close, () => d.close())])]);
}

/* ---------- publish: one commit with every change ---------- */
async function publish() {
  if (!count()) { toast(T.none); return; }
  const b = ui.querySelector(".ls-publish"); b.disabled = true; b.textContent = T.publishing;
  try {
    const parent = await headSha();
    const baseTree = (await (await gh(`/git/commits/${parent}`)).json()).tree.sha;
    const tree = [];
    const byFile = {};
    for (const e of textEdits.values()) (byFile[e.file] ||= []).push(e);
    for (const [file, edits] of Object.entries(byFile)) {
      // fresh copy of the file: keeps edits made meanwhile in the admin
      tree.push({ path: file, content: rewrite(file, await readFile(file, parent), edits) });
    }
    for (const [path, { file }] of binEdits) {
      const blob = await (await gh("/git/blobs", { method: "POST", body: JSON.stringify({ content: await b64file(file), encoding: "base64" }) })).json();
      const repoFile = (/\.pdf$/i.test(path) && CFG.pdf && CFG.pdf.repo ? CFG.pdf.repo + path : path);   // VS: static/pdf/…
      tree.push({ path: repoFile.replace(/^\//, ""), sha: blob.sha });
    }
    for (const t of tree) if (t.content !== undefined) {
      const blob = await (await gh("/git/blobs", { method: "POST", body: JSON.stringify({ content: b64text(t.content), encoding: "base64" }) })).json();
      t.sha = blob.sha; delete t.content;
    }
    const newTree = await (await gh("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: baseTree, tree: tree.map(t => ({ path: t.path, mode: "100644", type: "blob", sha: t.sha })) }) })).json();
    const files = tree.map(t => t.path.split("/").pop()).join(", ");
    const commit = await (await gh("/git/commits", { method: "POST", body: JSON.stringify({ message: `Edit on page: ${files}${translateOn() ? "" : " [no-translate]"}`, tree: newTree.sha, parents: [parent] }) })).json();
    await gh(`/git/refs/heads/${CFG.branch}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha }) });
    const hadTexts = [...textEdits.values()].some(e => CFG.files[0].includes("{lang}") && e.file !== DL);
    textEdits.clear(); binEdits.clear(); spans.forEach(x => { x.changed = false; x.keys = []; }); await clearPending();
    document.querySelectorAll(".ls-changed").forEach(x => x.classList.remove("ls-changed"));
    for (const f of Object.keys(byFile)) { const text = await readFile(f, commit.sha); sources[f] = { text, data: parse(f, text) }; }
    toast(T.published + (hadTexts && translateOn() ? " " + T.translating : ""), 9000);
  } catch (e) {
    console.error(e); toast(`${T.error}: ${e.message}`, 12000);
  }
  b.disabled = false; update();
}

/* ---------- UI ---------- */
function el(tag, attrs = {}, kids = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  for (const k of [].concat(kids)) e.append(k);
  return e;
}
function btn(text, fn, primary) { const b = el("button", { type: "button", class: primary ? "ls-btn ls-primary" : "ls-btn" }, text); b.addEventListener("click", fn); return b; }
function dialog(kids) {
  const d = el("dialog", { class: "ls-dialog" }, kids);
  ui.append(d); d.showModal();
  d.addEventListener("close", () => d.remove());
  d.addEventListener("click", e => { if (e.target === d) d.close(); });
  return d;
}
function toast(msg, ms = 4000) { const t = el("div", { class: "ls-toast", role: "status" }, msg); ui.append(t); setTimeout(() => t.remove(), ms); }
function trSwitch() {
  const cb = el("input", { type: "checkbox" }); cb.checked = translateOn();
  cb.addEventListener("change", () => { try { sessionStorage.setItem("ls-edit-translate", cb.checked ? "1" : "0"); } catch (e) {} });
  return el("label", { class: "ls-switch", title: T.translateHint }, [cb, " " + T.translate]);
}
let ui;
function update() {
  ui.querySelector(".ls-count").textContent = T.changes(count()); ui.classList.toggle("ls-dirty", count() > 0);
  const b = ui.querySelector(".ls-publish"); if (b && !b.disabled) b.textContent = T.publish + (count() ? ` (${count()})` : "");
}
function buildUI() {
  ui = el("div", { id: "ls-edit-ui", lang: CFG.lang });
  ui.append(el("style", {}, `
    .ls-t{outline:1px dashed rgb(255 0 255/.55);outline-offset:2px;border-radius:2px;cursor:text}
    .ls-t:hover,.ls-t.ls-on{outline:2px solid #ff00ff;background:rgb(255 0 255/.12)}
    .ls-changed{outline:2px solid #3ddc84!important}
    .ls-in-pdf{outline:0!important;cursor:pointer}
    img.ls-img{cursor:pointer}
    img.ls-img:hover{outline:3px solid #ff00ff;outline-offset:-3px}
    a.ls-pdf{outline:2px dashed #ff00ff;outline-offset:3px}
    body{padding-bottom:84px!important}
    #ls-edit-ui{font:15px/1.4 system-ui,sans-serif;color:#fff}
    #ls-edit-ui .ls-bar{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:#1d1416;border-top:2px solid #ff00ff;box-shadow:0 -6px 20px rgb(0 0 0/.4)}
    #ls-edit-ui .ls-title{font-weight:700;margin-right:auto}
    #ls-edit-ui .ls-switch{display:flex;align-items:center;gap:4px;font-size:14px;min-height:44px;cursor:pointer}
    #ls-edit-ui .ls-switch input{width:20px;height:20px;accent-color:#ff00ff}
    @media (max-width:520px){#ls-edit-ui .ls-bar{gap:6px;padding-inline:8px;justify-content:space-between}#ls-edit-ui .ls-bar .ls-btn{padding:8px 11px}#ls-edit-ui .ls-title,#ls-edit-ui .ls-count{display:none}}
    #ls-edit-ui .ls-count{opacity:.75}
    #ls-edit-ui.ls-dirty .ls-count{opacity:1;color:#3ddc84}
    #ls-edit-ui .ls-btn{font:inherit;padding:10px 14px;border-radius:999px;border:1px solid rgb(255 255 255/.35);background:transparent;color:#fff;cursor:pointer;min-height:44px}
    #ls-edit-ui .ls-primary{background:#ff00ff;border-color:#ff00ff;color:#0c0404;font-weight:700}
    #ls-edit-ui .ls-btn:disabled{opacity:.6}
    #ls-edit-ui .ls-dialog{max-width:min(92vw,560px);width:100%;border:0;border-radius:16px;background:#1d1416;color:#fff;padding:20px}
    #ls-edit-ui .ls-dialog::backdrop{background:rgb(0 0 0/.6)}
    #ls-edit-ui .ls-dialog h2{font-size:1.15rem;margin:0 0 12px;word-break:break-all}
    #ls-edit-ui .ls-dialog img{max-width:100%;max-height:45vh;display:block;margin:0 auto 12px;border-radius:8px}
    #ls-edit-ui .ls-dialog a{color:#ff00ff}
    #ls-edit-ui .ls-dialog input[type=password],#ls-edit-ui .ls-dialog input[type=text]{width:100%;font:inherit;padding:10px;border-radius:8px;border:1px solid rgb(255 255 255/.35);background:#0c0404;color:#fff;margin:8px 0}
    #ls-edit-ui .ls-small{font-size:13px;opacity:.8}
    #ls-edit-ui .ls-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:12px}
    #ls-edit-ui .ls-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px}
    #ls-edit-ui .ls-grid img{width:100%;aspect-ratio:1;object-fit:cover;margin:0;cursor:pointer}
    #ls-edit-ui .ls-places{position:fixed;left:12px;right:12px;z-index:2147483001;background:#1d1416;border:1px solid #ff00ff;border-radius:12px;padding:10px 12px;max-width:560px}
    #ls-edit-ui .ls-places p{margin:0 0 6px;font-size:13px;opacity:.85}
    #ls-edit-ui .ls-places label{display:block;padding:4px 0;font-size:14px}
    #ls-edit-ui .ls-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:2147483002;background:#fff;color:#0c0404;padding:12px 16px;border-radius:12px;max-width:90vw;box-shadow:0 6px 20px rgb(0 0 0/.4)}
  `));
  const bar = el("div", { class: "ls-bar" }, [
    el("span", { class: "ls-title" }, ["✎ ", el("span", { class: "ls-word" }, T.bar)]), el("span", { class: "ls-count" }, T.changes(0)),
    btn(T.photos, photosDialog), Object.assign(btn(T.publish, publish, true), { className: "ls-btn ls-primary ls-publish" }),
    trSwitch(),
    Object.assign(btn("✕", async () => { if (count() && !confirm(T.leave)) return; await clearPending(); sessionStorage.removeItem("ls-edit"); location.hash = ""; location.reload(); }), { title: T.exit, ariaLabel: T.exit }),
  ]);
  ui.append(bar);
  document.body.append(ui);
}

/* clicks: photos and PDF links open their dialog; editable text never follows its link */
document.addEventListener("click", e => {
  if (!ui || e.target.closest("#ls-edit-ui")) return;
  const a = e.target.closest("a.ls-pdf");
  if (a) { e.preventDefault(); e.stopPropagation(); pdfDialog(a); return; }
  const t = e.target.closest(".ls-t");
  if (t) { e.preventDefault(); e.stopPropagation(); return; }
  const img = e.target.closest("img.ls-img");
  if (img) { e.preventDefault(); e.stopPropagation(); photoDialog(img); }
}, true);


async function askToken() {
  return new Promise(res => {
    const input = el("input", { type: "password", autocomplete: "off", placeholder: "github_pat_…" });
    const d = dialog([el("h2", {}, T.tokenTitle), el("p", {}, T.tokenText), input,
      el("p", { class: "ls-small" }, [el("a", { href: CFG.admin, target: "_blank", rel: "noopener" }, CFG.admin.replace(/^https?:\/\//, ""))]),
      el("div", { class: "ls-row" }, [btn(T.cancel, () => { d.close(); res(null); }), btn(T.save, () => { const v = input.value.trim(); d.close(); res(v || null); }, true)])]);
  });
}

(async function start() {
  buildUI();
  token = getToken();
  for (let tries = 0; tries < 3; tries++) {
    if (!token) { token = await askToken(); if (!token) { toast("—"); return; } }
    try { const r = await (await gh("")).json(); if (r.permissions && r.permissions.push) break; throw new Error("no write access"); }
    catch (e) { toast(`${T.error}: ${e.message}`, 6000); try { localStorage.removeItem("ls-edit-token"); } catch (x) {} token = null; }
  }
  if (!token) return;
  try { if (!getToken()) localStorage.setItem("ls-edit-token", token); } catch (e) {}
  await load();
  markTexts(); markMedia(); await restorePending(); update();
  if (!sessionStorage.getItem("ls-edit-help")) { toast(T.help, 7000); sessionStorage.setItem("ls-edit-help", "1"); }
})();
