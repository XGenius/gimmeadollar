// Clone the voice and record every line in assets/script.js with ElevenLabs.
//
//   ELEVENLABS_API_KEY=... node tools/voice.mjs clone path/to/sample1.m4a [more samples...]
//   ELEVENLABS_API_KEY=... node tools/voice.mjs render            (all lines)
//   ELEVENLABS_API_KEY=... node tools/voice.mjs render i01 x14    (just these)
//
// clone saves the new voice id to tools/voice.json; render writes audio/<id>.mp3
// and audio/manifest.json, which the site picks up automatically.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KEY = process.env.ELEVENLABS_API_KEY;
const API = "https://api.elevenlabs.io/v1";
const cfgPath = path.join(root, "tools", "voice.json");
if (!KEY) { console.error("Set ELEVENLABS_API_KEY first."); process.exit(1); }

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

async function render(only) {
  const voice = process.env.ELEVENLABS_VOICE_ID || cfg.voice_id;
  if (!voice) throw new Error("No voice yet. Run clone first or set ELEVENLABS_VOICE_ID.");
  const S = loadScript();
  const lines = [...S.intro, ...S.extra, ...S.thanks, ...S.hover];
  const outDir = path.join(root, "audio");
  fs.mkdirSync(outDir, { recursive: true });
  const settings = Object.assign(
    { stability: 0.35, similarity_boost: 0.9, style: 0.55, use_speaker_boost: true },
    cfg.voice_settings || {}
  );
  for (let i = 0; i < lines.length; i++) {
    const [id, text] = lines[i];
    if (only.length && !only.includes(id)) continue;
    const res = await fetch(`${API}/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": KEY, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: cfg.model_id || "eleven_multilingual_v2", voice_settings: settings })
    });
    if (!res.ok) throw new Error(`${id} failed (${res.status}): ${await res.text()}`);
    fs.writeFileSync(path.join(outDir, `${id}.mp3`), Buffer.from(await res.arrayBuffer()));
    console.log(`${id}  ${text}`);
  }
  const have = lines.map(([id]) => id).filter((id) => fs.existsSync(path.join(outDir, `${id}.mp3`)));
  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify({ voice, clips: have }, null, 2) + "\n");
  console.log(`manifest.json lists ${have.length} of ${lines.length} lines.`);
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === "clone") await clone(args);
else if (cmd === "render") await render(args);
else console.log("Usage: node tools/voice.mjs clone <samples...> | render [ids...]");
