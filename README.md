# gimmeadollar.net

Static site, hosted on GitHub Pages. No build step.

- `index.html` home page, `thanks.html` Stripe success page, `404.html`
- `assets/config.js` Stripe Payment Link URL and site URL
- `assets/script.js` every line the character says (ids map to `audio/<id>.mp3`)
- `assets/buddy.js` SVG character, voice engine (recorded clips, then browser speech, then silent captions), endless monologue
- `assets/app.js` page wiring: pay button, sound toggle, tell-three-friends sharing
- `tools/voice.mjs` ElevenLabs clone + render. `ELEVENLABS_API_KEY=... node tools/voice.mjs clone sample.m4a` then `node tools/voice.mjs render`
- `tools/og.html` source for `assets/og.png` (social share image)

Local preview: `python3 -m http.server` in this folder.
