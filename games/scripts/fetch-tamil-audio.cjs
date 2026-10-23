#!/usr/bin/env node
/**
 * Downloads human Tamil recordings from Wikimedia Commons and prepares them
 * for the games:
 *
 *   assets/audio/tamil/<code>.mp3        trimmed, loudness-normalised, mono
 *   assets/js/tamil-audio-manifest.js    text → file map read by tamil-audio.js
 *   assets/audio/tamil/CREDITS.md        author / licence / source per file
 *   scripts/tamil-audio-sources.json     lock file: text → chosen Commons file
 *
 * Usage:  FFMPEG=/path/to/ffmpeg node scripts/fetch-tamil-audio.cjs [--refresh] [--reencode]
 *
 * Raw downloads are cached in .cache/tamil-audio-raw (git-ignored);
 * --reencode rebuilds every MP3 from that cache.
 *
 * Without --refresh the lock file is reused, so re-running only fetches
 * texts that are new. Files that already exist are not re-encoded.
 *
 * Source preference keeps one voice per kind where possible:
 *   letters → "Ta-" recordings (one speaker recorded every uyir and mei letter)
 *   words   → Lingua Libre "Sriveenkat" (one speaker, clean WAV)
 * then any other listed speaker. All sources are CC0 / CC BY-SA.
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const Tamil = require("../assets/js/tamil-kit.js");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "assets/audio/tamil");
const LOCK = path.join(ROOT, "scripts/tamil-audio-sources.json");
const MANIFEST = path.join(ROOT, "assets/js/tamil-audio-manifest.js");
const CREDITS = path.join(OUT_DIR, "CREDITS.md");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const API = "https://commons.wikimedia.org/w/api.php";
const UA = "LittleLearners-audio-fetch/1.0 (https://github.com/rajeswarandhandapani/kid-Learning-games)";
const refresh = process.argv.includes("--refresh");
const reencode = process.argv.includes("--reencode");
const RAW_CACHE = path.join(ROOT, ".cache/tamil-audio-raw");

const LETTER_PATTERNS = ["Ta-{}.ogg", "LL-Q5885 (tam)-Sriveenkat-{}.wav", "TA-{}.ogg", "Ta-{}.wav"];
const WORD_PATTERNS = [
  "LL-Q5885 (tam)-Sriveenkat-{}.wav", "Ta-{}.ogg", "LL-Q5885 (tam)-StarlitNocturne-{}.wav",
  "LL-Q5885 (tam)-Plantman-{}.wav", "TA-{}.ogg",
];

/** Every Tamil text the games may want to say. */
function wantedTexts() {
  const letters = [
    ...Tamil.VOWELS.map((v) => v.tamil),
    ...Tamil.CONSONANTS.map((c) => c.tamil),
    Tamil.AYTHAM.tamil,
    ...Tamil.UYIRMEI.map((u) => u.tamil),
  ];
  const words = new Set(Tamil.NUMBERS.map((n) => n.tamil));
  const src = fs.readFileSync(path.join(ROOT, "assets/js/tamil-words-data.js"), "utf8");
  for (const m of src.matchAll(/tamil: "([^"]+)"/g)) words.add(m[1]);
  // Days, months and colours for the Tamil Days & Colours game.
  const daysFile = path.join(ROOT, "assets/js/tamil-days-data.js");
  if (fs.existsSync(daysFile)) {
    for (const m of fs.readFileSync(daysFile, "utf8").matchAll(/tamil: "([^"]+)"/g)) words.add(m[1]);
  }
  for (const s of require(path.join(ROOT, "assets/js/tamil-sentences-data.js")).sentences) {
    words.add(s.word);
    (s.alternatives || []).forEach((a) => words.add(a));
  }
  letters.forEach((l) => words.delete(l));
  return [
    ...letters.map((text) => ({ text, kind: "letter" })),
    ...[...words].map((text) => ({ text: text.normalize("NFC"), kind: "word" })),
  ];
}

/** Stable ASCII file name: code points joined by "-" (அம்மா → 0b85-0bae-...). */
function fileId(text) {
  return [...text.normalize("NFC")].map((c) => c.codePointAt(0).toString(16).padStart(4, "0")).join("-");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(params) {
  const url = API + "?" + new URLSearchParams({ format: "json", ...params });
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return res.json();
    await sleep(3000 * (attempt + 1));
  }
  throw new Error("Commons API failed: " + url);
}

function stripHtml(html) {
  return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Looks up candidate titles in batches; returns title → imageinfo. */
async function lookup(titles) {
  const found = {};
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40);
    const data = await getJson({
      action: "query", prop: "imageinfo", iiprop: "url|extmetadata|size",
      titles: batch.map((t) => "File:" + t).join("|"),
    });
    const norm = Object.fromEntries((data.query.normalized || []).map((n) => [n.to, n.from]));
    for (const page of Object.values(data.query.pages)) {
      if (page.missing !== undefined || !page.imageinfo) continue;
      const info = page.imageinfo[0];
      const meta = info.extmetadata || {};
      const requested = (norm[page.title] || page.title).replace(/^File:/, "");
      found[requested] = {
        title: page.title,
        url: info.url,
        page: info.descriptionurl,
        author: stripHtml(meta.Artist && meta.Artist.value) || "Unknown",
        license: stripHtml(meta.LicenseShortName && meta.LicenseShortName.value),
        licenseUrl: meta.LicenseUrl ? meta.LicenseUrl.value : "",
      };
    }
    await sleep(1200);
  }
  return found;
}

async function resolveSources(wanted, lock) {
  const todo = wanted.filter((w) => refresh || !(w.text in lock));
  if (!todo.length) return lock;
  const candidates = new Map();
  for (const w of todo) {
    const patterns = w.kind === "letter" ? LETTER_PATTERNS : WORD_PATTERNS;
    candidates.set(w.text, patterns.map((p) => p.replace("{}", w.text)));
  }
  const found = await lookup([...new Set([...candidates.values()].flat())]);
  for (const [text, titles] of candidates) {
    const hit = titles.map((t) => found[t]).find(Boolean);
    lock[text] = hit || null;
  }
  return lock;
}

function parseSegments(log, duration) {
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  // Voiced segments are the gaps between silences.
  const segments = [];
  let cursor = 0;
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] - cursor > 0.04) segments.push([cursor, starts[i]]);
    cursor = ends[i] !== undefined ? ends[i] : duration;
  }
  if (duration - cursor > 0.04) segments.push([cursor, duration]);
  if (!segments.length) return [0, duration];
  // Main segment = the longest; extend through neighbours closer than 0.45 s
  // (syllables of one word), drop isolated short blips.
  const main = segments.reduce((a, b) => (b[1] - b[0] > a[1] - a[0] ? b : a));
  let [from, to] = main;
  for (let grew = true; grew; ) {
    grew = false;
    for (const [a, b] of segments) {
      if (a >= from && b <= to) continue;
      const gap = a > to ? a - to : from - b;
      if (gap < 0.45 || b - a > 0.3) { from = Math.min(from, a); to = Math.max(to, b); grew = true; }
    }
  }
  return [from, to];
}

function encode(input, output, tmp) {
  const norm = path.join(tmp, "norm.wav");
  execFileSync(FFMPEG, ["-v", "error", "-y", "-i", input, "-af", "highpass=f=70,loudnorm=I=-17:TP=-1.5:LRA=11", "-ac", "1", "-ar", "44100", norm]);
  const log = spawnSync(FFMPEG, ["-hide_banner", "-i", norm, "-af", "silencedetect=noise=-36dB:d=0.12", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const [h, m, sec] = (log.match(/Duration: (\d+):(\d+):([\d.]+)/) || [0, 0, 0, 0]).slice(1).map(Number);
  const dur = h * 3600 + m * 60 + sec;
  const [from, to] = parseSegments(log, dur);
  const a = Math.max(0, from - 0.06);
  const b = Math.min(dur, to + 0.15);
  // A short lead-in keeps mobile browsers from clipping the first consonant.
  execFileSync(FFMPEG, [
    "-v", "error", "-y", "-i", norm,
    "-af", `atrim=${a.toFixed(3)}:${b.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=${Math.max(0, b - a - 0.06).toFixed(3)}:d=0.06,adelay=40`,
    "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "64k", output,
  ]);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const wanted = wantedTexts();
  const lock = fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, "utf8")) : {};
  await resolveSources(wanted, lock);
  fs.writeFileSync(LOCK, JSON.stringify(lock, null, 2) + "\n");

  const tmp = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "klg-audio-"));
  fs.mkdirSync(RAW_CACHE, { recursive: true });
  const manifest = {};
  const credits = [];
  for (const { text } of wanted) {
    const src = lock[text];
    if (!src) continue;
    const id = fileId(text);
    const out = path.join(OUT_DIR, id + ".mp3");
    if (reencode || !fs.existsSync(out)) {
      const raw = path.join(RAW_CACHE, id + path.extname(src.url));
      if (!fs.existsSync(raw)) {
        let res;
        for (let attempt = 0; attempt < 6; attempt++) {
          res = await fetch(src.url, { headers: { "User-Agent": UA } });
          if (res.status !== 429 && res.status < 500) break;
          await sleep(5000 * 2 ** attempt);
        }
        if (!res.ok) { console.warn("download failed", text, res.status); continue; }
        fs.writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
        await sleep(1500);
      }
      encode(raw, out, tmp);
      process.stdout.write(".");
    }
    manifest[text] = id;
    credits.push(src);
  }
  fs.rmSync(tmp, { recursive: true, force: true });

  fs.writeFileSync(
    MANIFEST,
    "/* Generated by scripts/fetch-tamil-audio.cjs — do not edit by hand. */\n" +
      "window.KLG_TAMIL_AUDIO = " + JSON.stringify(manifest, null, 0).replace(/","/g, '",\n"') + ";\n"
  );

  const byAuthor = new Map();
  for (const c of credits) {
    const key = c.author + " · " + c.license;
    if (!byAuthor.has(key)) byAuthor.set(key, []);
    byAuthor.get(key).push(c);
  }
  let md = "# Tamil audio credits\n\n" +
    "The Tamil letter and word recordings in this folder are human recordings from " +
    "[Wikimedia Commons](https://commons.wikimedia.org/) and [Lingua Libre](https://lingualibre.org/). " +
    "They were trimmed, loudness-normalised and converted to MP3 by `scripts/fetch-tamil-audio.cjs`. " +
    "These modified files are shared under the same licence as each original.\n";
  for (const [key, list] of byAuthor) {
    md += `\n## ${key} (${list.length} files)\n\n`;
    const licenseUrl = list[0].licenseUrl;
    if (licenseUrl) md += `Licence: <${licenseUrl}>\n\n`;
    for (const c of list.sort((a, b) => a.title.localeCompare(b.title))) md += `- [${c.title.replace(/^File:/, "")}](${c.page})\n`;
  }
  fs.writeFileSync(CREDITS, md);

  const missing = wanted.filter((w) => !lock[w.text]);
  console.log(`\n${Object.keys(manifest).length} recordings ready; ${missing.length} texts without a recording.`);
  console.log("No recording:", missing.filter((m) => m.kind === "word").map((m) => m.text).join(" "));
}

main().catch((e) => { console.error(e); process.exit(1); });
