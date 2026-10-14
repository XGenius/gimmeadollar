// Clone the voice and record every line in assets/script.js with ElevenLabs.
//
//   ELEVENLABS_API_KEY=... node tools/voice.mjs clone path/to/sample1.m4a [more samples...]
//   ELEVENLABS_API_KEY=... node tools/voice.mjs render            (new or changed lines)
//   ELEVENLABS_API_KEY=... node tools/voice.mjs render all        (every line)
//   ELEVENLABS_API_KEY=... node tools/voice.mjs render i01 x14    (just these)
//
//   ELEVENLABS_API_KEY=... node tools/voice.mjs audit             (transcribe every clip, re-record bad ones)
//   node tools/voice.mjs master                                   (rebuild audio/ from tools/raw/)
//
// clone saves the new voice id to tools/voice.json. render keeps the untouched
// ElevenLabs take in tools/raw/<id>.mp3, checks it by transcribing it back, then
// masters it into audio/<id>.mp3 (sped up, trimmed, faded, level matched) and
// writes audio/manifest.json, which the site picks up automatically.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KEY = process.env.ELEVENLABS_API_KEY;
const API = "https://api.elevenlabs.io/v1";
const cfgPath = path.join(root, "tools", "voice.json");
if (!KEY && process.argv[2] !== "master") { console.error("Set ELEVENLABS_API_KEY first."); process.exit(1); }

const cfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, "utf8")) : {};
const save = () => fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n");

function loadScript() {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, "assets", "script.js"), "utf8"), ctx);
  return ctx.window.GAD_SCRIPT;
}

async function clone(files) {
  if (!files.length) throw new Error("Pass at least one audio sample.");
  const form = new FormData();
  form.append("name", "Gimme A Dollar");
  form.append("description", "The voice of gimmeadollar.net");
  form.append("remove_background_noise", "true");
  for (const f of files) {
    form.append("files", new Blob([fs.readFileSync(f)]), path.basename(f));
  }
  const res = await fetch(`${API}/voices/add`, { method: "POST", headers: { "xi-api-key": KEY }, body: form });
  const body = await res.json();
  if (!res.ok) throw new Error(`Clone failed (${res.status}): ${JSON.stringify(body)}`);
  cfg.voice_id = body.voice_id;
  save();
  console.log(`Cloned. voice_id ${body.voice_id} saved to tools/voice.json`);
}

// Plain speech in this voice runs about 0.22 to 0.33 seconds a word.
const MAX_SECS_PER_WORD = 0.36;
function duration(file) {
  try {
    return parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());
  } catch (_) {
    throw new Error("ffprobe is needed to catch garbled clips. Install ffmpeg.");
  }
}

// Mastering: trim, short fades (no pops when a clip starts or stops mid-sound)
// and a peak limit (no crackle). Speed stays at 1: the browser speeds the
// voice up at playback. Offline time-stretching (Rubber Band) made the voice
// sound like it was in a tin can, so `tempo` in tools/voice.json defaults to 1.
const TEMPO = cfg.tempo || 1;
const rawDir = path.join(root, "tools", "raw");
let stretch;
function master(id) {
  if (stretch === undefined) {
    const f = execFileSync("ffmpeg", ["-hide_banner", "-filters"]).toString();
    stretch = /\brubberband\b/.test(f) ? `rubberband=tempo=${TEMPO}:transients=smooth:window=standard` : `atempo=${TEMPO}`;
    if (!/rubberband/.test(stretch)) console.warn("ffmpeg has no rubberband filter; using atempo.");
  }
  const chain = [
    "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02",
    "areverse", "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05", "areverse",
    ...(TEMPO === 1 ? [] : [stretch]),
    "afade=t=in:d=0.015", "areverse", "afade=t=in:d=0.04", "areverse",
    "adelay=30:all=1", "apad=pad_dur=0.08"
  ].join(",");
  const wav = path.join(rawDir, `${id}.tmp.wav`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", path.join(rawDir, `${id}.mp3`), "-af", chain, "-ac", "1", "-ar", "44100", wav]);
  // Keep peaks 2 dB under full scale so the mp3 never clips (crackles) on decode.
  const max = parseFloat((peakReport(wav).match(/max_volume: (-?[\d.]+) dB/) || [])[1] || "0");
  const gain = -2 - max;
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", wav, "-af", `volume=${gain.toFixed(2)}dB`, "-c:a", "libmp3lame", "-b:a", "128k", path.join(root, "audio", `${id}.mp3`)]);
  fs.unlinkSync(wav);
}
function peakReport(wav) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", wav, "-af", "volumedetect", "-f", "null", "-"]);
  return r.stderr.toString();
}

// Transcribe a take with ElevenLabs Scribe and compare it to the line. Catches
// babble, swallowed words and odd noises that still come out a normal length.
const norm = (t) => t.toLowerCase().replace(/give me/g, "gimme").replace(/gonna/g, "going to").replace(/[^a-z0-9' ]+/g, " ").replace(/'/g, "").split(/\s+/).filter(Boolean);
function similarity(a, b) {
  const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[m][n] / Math.max(m, n, 1);
}
async function check(file, text) {
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("language_code", "en");
  form.append("tag_audio_events", "true");
  form.append("file", new Blob([fs.readFileSync(file)]), path.basename(file));
  const res = await fetch(`${API}/speech-to-text`, { method: "POST", headers: { "xi-api-key": KEY }, body: form });
  if (!res.ok) { console.warn(`  transcribe failed (${res.status}), skipping check`); return { ok: true, heard: "?" }; }
  const body = await res.json();
  const events = (body.words || []).filter((w) => w.type === "audio_event").map((w) => w.text);
  const heard = (body.words || []).filter((w) => w.type === "word").map((w) => w.text).join(" ") || body.text || "";
  const score = similarity(norm(text), norm(heard));
  return { ok: score >= 0.85 && !events.length, score, heard, events };
}

async function render(only) {
  const voice = process.env.ELEVENLABS_VOICE_ID || cfg.voice_id;
  if (!voice) throw new Error("No voice yet. Run clone first or set ELEVENLABS_VOICE_ID.");
  const S = loadScript();
  const lines = [...S.intro, ...S.extra, ...S.thanks, ...S.hover];
  const outDir = path.join(root, "audio");
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(rawDir, { recursive: true });
  // With no ids, record only lines that are new or whose words changed since
  // their clip was made ("all" re-records everything).
  const manifestPath = path.join(outDir, "manifest.json");
  const prev = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
  const madeFrom = prev.texts || {};
  if (only[0] === "all") only = lines.map(([id]) => id);
  else if (!only.length) {
    only = lines.filter(([id, text]) => madeFrom[id] !== text || !fs.existsSync(path.join(rawDir, `${id}.mp3`))).map(([id]) => id);
    if (!only.length) { console.log("Every line already has an up-to-date clip."); return; }
  }
  const settings = Object.assign(
    { stability: 0.35, similarity_boost: 0.9, style: 0.55, use_speaker_boost: true },
    cfg.voice_settings || {}
  );
  for (let i = 0; i < lines.length; i++) {
    const [id, text] = lines[i];
    if (!only.includes(id)) continue;
    // The model sometimes tacks garbled babble onto a line. That shows up as a
    // clip far longer than the words need, so re-roll those with a steadier
    // voice until the length looks like plain speech.
    const words = text.split(/\s+/).length;
    const file = path.join(rawDir, `${id}.mp3`);
    let best = null;
    for (let attempt = 0; ; attempt++) {
      const steady = Math.min(attempt, 3);
      const res = await fetch(`${API}/text-to-speech/${voice}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": KEY, "content-type": "application/json", accept: "audio/mpeg" },
        body: JSON.stringify({
          text,
          model_id: cfg.model_id || "eleven_multilingual_v2",
          voice_settings: { ...settings, stability: Math.min(0.8, settings.stability + steady * 0.15), style: Math.max(0, settings.style - steady * 0.15) }
        })
      });
      if (!res.ok) throw new Error(`${id} failed (${res.status}): ${await res.text()}`);
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      const secs = duration(file);
      const perWord = secs / Math.max(words, 4);
      const heard = perWord <= MAX_SECS_PER_WORD ? await check(file, text) : { ok: false, score: 0, heard: "(too long)" };
      console.log(`${id}  ${secs.toFixed(2)}s  ${perWord.toFixed(2)}s/word  match ${(heard.score ?? 1).toFixed(2)}${heard.events && heard.events.length ? "  events " + heard.events.join(" ") : ""}  ${text}${heard.ok ? "" : "\n      heard: " + heard.heard}`);
      const score = (heard.ok ? 2 : 0) + (heard.score || 0);
      if (!best || score > best.score) { best = { score, data: fs.readFileSync(file) }; }
      if (heard.ok || attempt >= 5) break;
    }
    fs.writeFileSync(file, best.data);
    master(id);
  }
  const have = lines.map(([id]) => id).filter((id) => fs.existsSync(path.join(outDir, `${id}.mp3`)));
  const texts = {};
  for (const [id, text] of lines) {
    if (!have.includes(id)) continue;
    texts[id] = only.includes(id) ? text : madeFrom[id] || text;
  }
  fs.writeFileSync(manifestPath, JSON.stringify({ voice, tempo: TEMPO, clips: have, texts }, null, 2) + "\n");
  console.log(`manifest.json lists ${have.length} of ${lines.length} lines.`);
}

// Transcribe every existing take and re-record the ones that don't match.
async function audit() {
  const S = loadScript();
  const bad = [];
  for (const [id, text] of [...S.intro, ...S.extra, ...S.thanks, ...S.hover]) {
    const file = path.join(rawDir, `${id}.mp3`);
    if (!fs.existsSync(file)) continue;
    const r = await check(file, text);
    console.log(`${r.ok ? "ok " : "BAD"} ${id}  match ${(r.score ?? 1).toFixed(2)}${r.events && r.events.length ? "  events " + r.events.join(" ") : ""}  ${text}${r.ok ? "" : "\n      heard: " + r.heard}`);
    if (!r.ok) bad.push(id);
  }
  console.log(`${bad.length} bad: ${bad.join(" ")}`);
  if (bad.length) await render(bad);
}

function masterAll() {
  const m = JSON.parse(fs.readFileSync(path.join(root, "audio", "manifest.json"), "utf8"));
  for (const id of m.clips) master(id);
  m.tempo = TEMPO;
  fs.writeFileSync(path.join(root, "audio", "manifest.json"), JSON.stringify(m, null, 2) + "\n");
  console.log(`Mastered ${m.clips.length} clips at ${TEMPO}x.`);
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === "clone") await clone(args);
else if (cmd === "render") await render(args);
else if (cmd === "audit") await audit();
else if (cmd === "master") masterAll();
else console.log("Usage: node tools/voice.mjs clone <samples...> | render [ids...]");
