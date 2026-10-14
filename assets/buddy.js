// The little guy: an SVG character whose mouth follows whatever voice is
// playing, plus the engine that keeps him talking forever.
(function () {
  const NS = "http://www.w3.org/2000/svg";

  // The silly guy. Drawn on a 300x340 grid, then scaled into the
  // 400x470 stage. `look` is "natural", "shades" or "me" (D1G1T0L bare-faced, in sunglasses, or in a camo bandana) or "generic".
  const INK = "#1f1a17", SKIN = "#eab896", SKIN_D = "#c98d63";
  const S = `stroke="${INK}" stroke-linejoin="round" stroke-linecap="round"`;

  // Curly hair: scalloped outlines (each bump is a loose curl) plus a few
  // curl strokes for texture.
  const HAIR = "#3b2a1f";
  function scallop(pts, amp) {
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
      const cx = (x0 + x1) / 2 + (dy / len) * amp, cy = (y0 + y1) / 2 - (dx / len) * amp;
      d += ` Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1} ${y1}`;
    }
    return d;
  }
  const mirror = (pts) => pts.map(([x, y]) => [300 - x, y]);
  const SIDE = [[118, 132], [116, 196], [114, 240], [108, 276], [88, 284], [66, 278], [62, 252], [66, 226], [64, 200], [70, 174], [72, 148], [80, 122], [94, 100]];
  const TEXTURE_L = "M84 150 q10 8 2 18 q-8 10 2 18 M76 210 q10 8 2 18 q-8 10 2 18 M96 236 q8 8 0 16";
  const TEXTURE_R = "M216 150 q-10 8 -2 18 q8 10 -2 18 M224 210 q-10 8 -2 18 q8 10 -2 18 M204 236 q-8 8 0 16";
  const CURLY_BACK =
    `<path d="${scallop(SIDE, 9)} Z" fill="${HAIR}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="${scallop(mirror(SIDE).reverse(), 9)} Z" fill="${HAIR}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="${TEXTURE_L} ${TEXTURE_R}" fill="none" stroke="#6b4a33" stroke-width="3" stroke-linecap="round"/>`;
  const CROWN = [];
  for (let i = 0; i <= 9; i++) {
    const a = Math.PI * (1.0 + i / 9);
    CROWN.push([+(150 + Math.cos(a) * 68).toFixed(1), +(112 + Math.sin(a) * 76).toFixed(1)]);
  }
  const HAIRLINE = [[218, 112], [204, 96], [188, 90], [172, 92], [158, 82], [142, 84], [128, 92], [112, 90], [96, 98], [82, 112]];
  const CURLY_TOP =
    `<path d="${scallop(CROWN, 10)} ${scallop(HAIRLINE, -6).replace(/^M[^Q]*/, "")} Z" fill="${HAIR}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="M112 62 q8 -8 16 0 q8 8 16 0 M160 54 q8 -8 16 0 q8 8 16 0 M98 82 q6 -8 14 -4" fill="none" stroke="#6b4a33" stroke-width="3" stroke-linecap="round"/>`;

  const LOOKS = {
    me: {
      outfit: "tee",
      mouth: { cx: 150, cy: 186, w: 25, rest: 0.22 },
      back: CURLY_BACK,
      face: `
        <ellipse cx="150" cy="130" rx="64" ry="78" fill="${SKIN}" stroke-width="6" ${S}/>
        <path d="M88 104 Q86 38 150 36 Q214 38 212 104 Z" fill="#3b2a1f" stroke-width="5" ${S}/>
        <clipPath id="gad-band-__UID__"><path d="M80 94 Q150 66 220 94 L222 120 Q150 94 78 120 Z"/></clipPath>
        <g class="gad-hat">
          <path d="M218 100 Q246 90 256 104 Q240 110 222 110 Z M220 108 Q244 116 248 134 Q232 128 218 116 Z" fill="#5d6b3d" stroke-width="4" ${S}/>
          <g clip-path="url(#gad-band-__UID__)">
            <rect x="70" y="60" width="160" height="70" fill="#5d6b3d"/>
            <ellipse cx="98" cy="102" rx="16" ry="7" fill="#2f3a22" transform="rotate(-14 98 102)"/>
            <ellipse cx="132" cy="88" rx="18" ry="6" fill="#8c7b52"/>
            <ellipse cx="160" cy="98" rx="14" ry="8" fill="#2f3a22"/>
            <ellipse cx="190" cy="86" rx="16" ry="6" fill="#d9d2b4" transform="rotate(10 190 86)"/>
            <ellipse cx="206" cy="104" rx="12" ry="7" fill="#8c7b52"/>
            <ellipse cx="118" cy="106" rx="10" ry="5" fill="#d9d2b4"/>
            <ellipse cx="176" cy="108" rx="12" ry="5" fill="#44522c"/>
          </g>
          <path d="M80 94 Q150 66 220 94 L222 120 Q150 94 78 120 Z" fill="none" stroke-width="5" ${S}/>
        </g>
        <g class="gad-brows">
          <path class="gad-brow-l" d="M106 128 Q122 118 140 124" fill="none" stroke="#2a1d15" stroke-width="7" stroke-linecap="round"/>
          <path class="gad-brow-r" d="M160 124 Q178 118 194 128" fill="none" stroke="#2a1d15" stroke-width="7" stroke-linecap="round"/>
        </g>
        <g class="gad-eyes">
          <ellipse cx="125" cy="140" rx="12" ry="10" fill="#fff" stroke-width="4" ${S}/>
          <ellipse cx="175" cy="140" rx="12" ry="10" fill="#fff" stroke-width="4" ${S}/>
          <g class="gad-pupils">
            <circle cx="126" cy="141" r="5.5" fill="${INK}"/><circle cx="174" cy="141" r="5.5" fill="${INK}"/>
            <circle cx="128" cy="139" r="2" fill="#fff"/><circle cx="176" cy="139" r="2" fill="#fff"/>
          </g>
        </g>
        <path d="M106 146 l-6 4 M194 146 l6 4" stroke="${SKIN_D}" stroke-width="3" stroke-linecap="round"/>
        <path d="M150 142 q-11 18 3 21" fill="none" stroke="${SKIN_D}" stroke-width="5" stroke-linecap="round"/>
        <path d="M86 140 Q84 204 110 240 Q128 266 150 270 Q172 266 190 240 Q216 204 214 140 Q206 170 188 176 Q170 164 150 166 Q130 164 112 176 Q94 170 86 140 Z" fill="#3a2b22" stroke-width="5" ${S}/>
        <path d="M100 196 q6 18 16 30 M200 196 q-6 18 -16 30 M120 222 q4 14 12 22 M180 222 q-4 14 -12 22" fill="none" stroke="#2a1d15" stroke-width="3" stroke-linecap="round"/>
        <path d="M128 214 q4 16 10 30 M140 222 q2 18 6 36 M152 226 q0 18 -2 34 M164 220 q-2 18 -8 34 M174 210 q-4 16 -10 28 M118 200 q2 10 6 18 M182 200 q-2 10 -6 18" fill="none" stroke="#a89f95" stroke-width="2.5" stroke-linecap="round" opacity=".75"/>`,
      front: `
        <path d="M116 176 Q134 162 150 170 Q166 162 184 176 Q170 186 150 180 Q130 186 116 176 Z" fill="#3a2b22" stroke-width="4" ${S}/>`
    },
    // "me" with a rounder beard and a tie-dye bandana; built below from "me".
    tiedye: null,
    natural: {
      outfit: "tee",
      mouth: { cx: 150, cy: 186, w: 25, rest: 0.22 },
      back: CURLY_BACK,
      face: `
        <ellipse cx="150" cy="130" rx="64" ry="78" fill="${SKIN}" stroke-width="6" ${S}/>
        <g class="gad-hat">${CURLY_TOP}</g>
        <g class="gad-brows">
          <path class="gad-brow-l" d="M106 128 Q122 118 140 124" fill="none" stroke="#2a1d15" stroke-width="7" stroke-linecap="round"/>
          <path class="gad-brow-r" d="M160 124 Q178 118 194 128" fill="none" stroke="#2a1d15" stroke-width="7" stroke-linecap="round"/>
        </g>
        <g class="gad-eyes">
          <ellipse cx="125" cy="140" rx="12" ry="10" fill="#fff" stroke-width="4" ${S}/>
          <ellipse cx="175" cy="140" rx="12" ry="10" fill="#fff" stroke-width="4" ${S}/>
          <g class="gad-pupils">
            <circle cx="126" cy="141" r="5.5" fill="${INK}"/><circle cx="174" cy="141" r="5.5" fill="${INK}"/>
            <circle cx="128" cy="139" r="2" fill="#fff"/><circle cx="176" cy="139" r="2" fill="#fff"/>
          </g>
        </g>
        <path d="M106 146 l-6 4 M194 146 l6 4" stroke="${SKIN_D}" stroke-width="3" stroke-linecap="round"/>
        <path d="M150 142 q-11 18 3 21" fill="none" stroke="${SKIN_D}" stroke-width="5" stroke-linecap="round"/>
        <path d="M86 140 Q84 204 110 240 Q128 266 150 270 Q172 266 190 240 Q216 204 214 140 Q206 170 188 176 Q170 164 150 166 Q130 164 112 176 Q94 170 86 140 Z" fill="#3a2b22" stroke-width="5" ${S}/>
        <path d="M100 196 q6 18 16 30 M200 196 q-6 18 -16 30 M120 222 q4 14 12 22 M180 222 q-4 14 -12 22" fill="none" stroke="#2a1d15" stroke-width="3" stroke-linecap="round"/>
        <path d="M128 214 q4 16 10 30 M140 222 q2 18 6 36 M152 226 q0 18 -2 34 M164 220 q-2 18 -8 34 M174 210 q-4 16 -10 28 M118 200 q2 10 6 18 M182 200 q-2 10 -6 18" fill="none" stroke="#a89f95" stroke-width="2.5" stroke-linecap="round" opacity=".75"/>`,
      front: `
        <path d="M116 176 Q134 162 150 170 Q166 162 184 176 Q170 186 150 180 Q130 186 116 176 Z" fill="#3a2b22" stroke-width="4" ${S}/>`
    },
    shades: {
      outfit: "tee",
      mouth: { cx: 150, cy: 186, w: 25, rest: 0.22 },
      back: CURLY_BACK,
      face: `
        <ellipse cx="150" cy="130" rx="64" ry="78" fill="${SKIN}" stroke-width="6" ${S}/>
        <g class="gad-hat">${CURLY_TOP}</g>
        <g class="gad-brows">
          <path class="gad-brow-l" d="M106 118 Q122 108 140 114" fill="none" stroke="#2a1d15" stroke-width="7" stroke-linecap="round"/>
          <path class="gad-brow-r" d="M160 114 Q178 108 194 118" fill="none" stroke="#2a1d15" stroke-width="7" stroke-linecap="round"/>
        </g>
        <path d="M98 128 Q150 120 202 128" fill="none" stroke="${INK}" stroke-width="5"/>
        <path d="M100 130 Q100 158 120 160 Q142 160 144 136 Q142 126 122 126 Q102 126 100 130 Z" fill="#5a3418" stroke-width="5" ${S}/>
        <path d="M200 130 Q200 158 180 160 Q158 160 156 136 Q158 126 178 126 Q198 126 200 130 Z" fill="#5a3418" stroke-width="5" ${S}/>
        <path d="M100 134 L86 130 M200 134 L214 130" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
        <g class="gad-pupils">
          <path d="M108 134 L118 134 L110 150 Z M164 134 L174 134 L166 150 Z" fill="#fff" opacity=".45"/>
          <circle cx="134" cy="138" r="3" fill="#ffb766" opacity=".8"/><circle cx="190" cy="138" r="3" fill="#ffb766" opacity=".8"/>
        </g>
        
        <path d="M150 142 q-11 18 3 21" fill="none" stroke="${SKIN_D}" stroke-width="5" stroke-linecap="round"/>
        <path d="M86 140 Q84 204 110 240 Q128 266 150 270 Q172 266 190 240 Q216 204 214 140 Q206 170 188 176 Q170 164 150 166 Q130 164 112 176 Q94 170 86 140 Z" fill="#3a2b22" stroke-width="5" ${S}/>
        <path d="M100 196 q6 18 16 30 M200 196 q-6 18 -16 30 M120 222 q4 14 12 22 M180 222 q-4 14 -12 22" fill="none" stroke="#2a1d15" stroke-width="3" stroke-linecap="round"/>
        <path d="M128 214 q4 16 10 30 M140 222 q2 18 6 36 M152 226 q0 18 -2 34 M164 220 q-2 18 -8 34 M174 210 q-4 16 -10 28 M118 200 q2 10 6 18 M182 200 q-2 10 -6 18" fill="none" stroke="#a89f95" stroke-width="2.5" stroke-linecap="round" opacity=".75"/>`,
      front: `
        <path d="M116 176 Q134 162 150 170 Q166 162 184 176 Q170 186 150 180 Q130 186 116 176 Z" fill="#3a2b22" stroke-width="4" ${S}/>`
    },
    generic: {
      mouth: { cx: 150, cy: 172, w: 28, rest: 0 },
      back: "",
      face: `
        <ellipse cx="80" cy="130" rx="13" ry="19" fill="${SKIN}" stroke-width="5" ${S}/>
        <ellipse cx="220" cy="130" rx="13" ry="19" fill="${SKIN}" stroke-width="5" ${S}/>
        <ellipse cx="150" cy="128" rx="70" ry="80" fill="${SKIN}" stroke-width="6" ${S}/>
        <path class="gad-hat" d="M80 120 Q74 42 150 40 Q226 42 220 120 Q214 84 178 78 Q160 92 134 76 Q96 82 80 120 Z" fill="#5a3a22" stroke-width="6" ${S}/>
        <ellipse cx="108" cy="158" rx="14" ry="8" fill="#ff8f7a" opacity=".45"/>
        <ellipse cx="192" cy="158" rx="14" ry="8" fill="#ff8f7a" opacity=".45"/>
        <g class="gad-brows">
          <path class="gad-brow-l" d="M104 92 Q122 80 140 88" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
          <path class="gad-brow-r" d="M160 88 Q178 80 196 92" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
        </g>
        <g class="gad-eyes">
          <ellipse cx="124" cy="120" rx="13" ry="15" fill="#fff" stroke-width="4" ${S}/>
          <ellipse cx="176" cy="120" rx="13" ry="15" fill="#fff" stroke-width="4" ${S}/>
          <g class="gad-pupils">
            <circle cx="126" cy="122" r="6" fill="${INK}"/><circle cx="174" cy="122" r="6" fill="${INK}"/>
            <circle cx="128" cy="119" r="2.5" fill="#fff"/><circle cx="176" cy="119" r="2.5" fill="#fff"/>
          </g>
        </g>
        <path d="M150 128 q-12 22 4 24" fill="none" stroke="${SKIN_D}" stroke-width="5" stroke-linecap="round"/>`,
      front: ""
    }
  };

  // Tie-dye look (live since 2026-10-14): "me" with a full, rounded beard and a
  // rainbow spiral bandana. Built from the "me" drawing so the two stay in step.
  const TIEDYE_STOPS = ["#ff4d6d", "#ff9f1c", "#ffe347", "#3ddc97", "#3a86ff", "#9b5de5"]
    .map((c, i, a) => `<stop offset="${(i / (a.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join("");
  const TIEDYE_SWIRL = `<path d="M84 108 q22 -18 44 -6 q22 12 44 -4 q22 -14 44 2 M90 100 q18 -14 36 -8 M170 90 q16 -6 34 4" fill="none" stroke="#fff" stroke-width="2.5" opacity=".55" stroke-linecap="round"/>`;
  LOOKS.tiedye = Object.assign({}, LOOKS.me, {
    face: LOOKS.me.face
      .replace('<clipPath id="gad-band-__UID__">',
        `<radialGradient id="gad-td-__UID__" gradientUnits="userSpaceOnUse" cx="150" cy="92" r="30" spreadMethod="reflect">${TIEDYE_STOPS}</radialGradient><clipPath id="gad-band-__UID__">`)
      // Knot tails.
      .replace('fill="#5d6b3d" stroke-width="4"', 'fill="url(#gad-td-__UID__)" stroke-width="4"')
      // The band itself: swap the camo for the spiral.
      .replace(/<rect x="70" y="60" width="160" height="70" fill="#5d6b3d"\/>[\s\S]*?<\/g>/,
        `<rect x="70" y="60" width="160" height="70" fill="url(#gad-td-__UID__)"/>${TIEDYE_SWIRL}</g>`)
      // A fuller beard that rounds off at the bottom instead of coming to a point.
      .replace("M86 140 Q84 204 110 240 Q128 266 150 270 Q172 266 190 240 Q216 204 214 140",
        "M84 140 Q80 214 104 248 Q124 274 150 274 Q176 274 196 248 Q220 214 216 140")
  });

  // Outfits. The suit is the dressed-up look; the tee matches
  // D1G1T0L's everyday style (navy graphic tee with a wave print).
  const TEE = "#24335e", TEE_D = "#18244a";
  const OUTFITS = {
    suit: (bill) => `
    <path d="M95 206 L205 206 L228 336 L72 336 Z" fill="#2d3a64" stroke-width="6" ${S}/>
    <path d="M128 206 L150 248 L172 206 Z" fill="#fff" stroke-width="4" ${S}/>
    <path d="M150 214 L142 230 L150 290 L158 230 Z" fill="#e4572e" stroke-width="4" ${S}/>
    <path d="M128 206 L150 270 L120 300 M172 206 L150 270 L180 300" fill="none" stroke="#1b2444" stroke-width="5"/>
    <g class="gad-arm-left">
      <path d="M100 222 Q60 210 34 172" fill="none" stroke="${INK}" stroke-width="30" stroke-linecap="round"/>
      <path d="M100 222 Q60 210 34 172" fill="none" stroke="#2d3a64" stroke-width="19" stroke-linecap="round"/>
      <circle cx="32" cy="166" r="15" fill="${SKIN}" stroke-width="5" ${S}/>
    </g>
    <g class="gad-arm-right">
      ${bill}
      <path d="M200 222 Q240 214 266 176" fill="none" stroke="${INK}" stroke-width="30" stroke-linecap="round"/>
      <path d="M200 222 Q240 214 266 176" fill="none" stroke="#2d3a64" stroke-width="19" stroke-linecap="round"/>
      <circle cx="268" cy="170" r="15" fill="${SKIN}" stroke-width="5" ${S}/>
    </g>
`,
    tee: (bill) => `
    <path d="M90 212 Q150 196 210 212 L222 336 L78 336 Z" fill="${TEE}" stroke-width="6" ${S}/>
    <g transform="translate(150 306)">
      <circle r="27" fill="#bfe3f5" stroke="${INK}" stroke-width="4"/>
      <path d="M-25 8 Q-14 -18 6 -16 Q20 -14 16 -2 Q10 6 2 0 Q8 -8 -2 -8 Q-14 -6 -14 10 Q-6 22 25 8 L25 14 Q0 30 -25 14 Z" fill="#2f6fb5" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M-10 -6 q4 -6 10 -6 M6 -12 l4 -3 M12 -10 l5 -1" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <circle cx="13" cy="-13" r="3" fill="#fff"/>
    </g>
    <g class="gad-arm-left">
      <path d="M100 222 Q60 210 34 172" fill="none" stroke="${INK}" stroke-width="28" stroke-linecap="round"/>
      <path d="M100 222 Q60 210 34 172" fill="none" stroke="${SKIN}" stroke-width="17" stroke-linecap="round"/>
      <path d="M106 224 Q86 220 72 212" fill="none" stroke="${INK}" stroke-width="36" stroke-linecap="round"/>
      <path d="M106 224 Q86 220 72 212" fill="none" stroke="${TEE}" stroke-width="25" stroke-linecap="round"/>
      <circle cx="32" cy="166" r="15" fill="${SKIN}" stroke-width="5" ${S}/>
    </g>
    <g class="gad-arm-right">
      ${bill}
      <path d="M200 222 Q240 214 266 176" fill="none" stroke="${INK}" stroke-width="28" stroke-linecap="round"/>
      <path d="M200 222 Q240 214 266 176" fill="none" stroke="${SKIN}" stroke-width="17" stroke-linecap="round"/>
      <path d="M194 224 Q214 220 228 212" fill="none" stroke="${INK}" stroke-width="36" stroke-linecap="round"/>
      <path d="M194 224 Q214 220 228 212" fill="none" stroke="${TEE}" stroke-width="25" stroke-linecap="round"/>
      <circle cx="268" cy="170" r="15" fill="${SKIN}" stroke-width="5" ${S}/>
    </g>
    <path d="M120 336 L120 318 M180 336 L180 318" stroke="${TEE_D}" stroke-width="3"/>`
  };

  // Little legs in jeans and sneakers, for a host who walks around. They sit
  // behind the shirt, hinge at the hip, and swing while .is-walking is on.
  const DENIM = "#3d5f93";
  const LEGS = `
    <g class="gad-leg gad-leg-l">
      <path d="M108 318 H140 V382 H108 Z" fill="${DENIM}" stroke-width="5" ${S}/>
      <path d="M90 396 Q90 376 112 376 H140 Q146 376 146 386 V396 Z" fill="#fff" stroke-width="5" ${S}/>
      <path d="M92 396 H144" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    </g>
    <g class="gad-leg gad-leg-r">
      <path d="M160 318 H192 V382 H160 Z" fill="${DENIM}" stroke-width="5" ${S}/>
      <path d="M210 396 Q210 376 188 376 H160 Q154 376 154 386 V396 Z" fill="#fff" stroke-width="5" ${S}/>
      <path d="M156 396 H208" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    </g>`;

  let uidCounter = 0;
  function svgMarkup(happy, lookName, legs) {
    const uid = ++uidCounter;
    const L = LOOKS[lookName] || LOOKS.me;
    const m = L.mouth;
    const bill = happy ? `
        <g class="gad-bill">
          <rect x="246" y="128" width="54" height="28" rx="3" fill="#a9dc8c" stroke-width="4" ${S} transform="rotate(-14 273 142)"/>
          <circle cx="273" cy="142" r="7" fill="none" stroke="${INK}" stroke-width="3" transform="rotate(-14 273 142)"/>
        </g>` : "";
    return `
<svg viewBox="0 0 400 ${legs ? 540 : 470}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A cartoon silly guy, arms wide, asking you for a dollar">
  <defs>
    <clipPath id="gad-mouth-clip-${uid}"><path class="gad-mouth-shape"/></clipPath>
  </defs>
  <ellipse cx="200" cy="${legs ? 527 : 452}" rx="${legs ? 100 : 120}" ry="12" fill="#000" opacity=".12" class="gad-shadow"/>
  <g class="gad-buddy">
   <g transform="translate(20 46) scale(1.2)">
    ${L.back}
    ${legs ? LEGS : ""}
    ${(OUTFITS[L.outfit] || OUTFITS.suit)(bill)}
    ${L.face.replace(/__UID__/g, uid)}
    <g class="gad-mouth">
      <path class="gad-mouth-shape" fill="#5a1720" stroke-width="5" ${S}/>
      <g clip-path="url(#gad-mouth-clip-${uid})">
        <rect x="${m.cx - m.w}" y="${m.cy - 6}" width="${m.w * 2}" height="${m.w * 0.42 + 6}" fill="#fff"/>
        <ellipse class="gad-tongue" cx="${m.cx}" cy="${m.cy + 20}" rx="${m.w * 0.62}" ry="${m.w * 0.36}" fill="#ff6b81"/>
      </g>
    </g>
    ${L.front}
   </g>
  </g>
</svg>`;
  }

  function mouthPath(m, o, smile) {
    o = m.rest + o * (1 - m.rest);
    const w = m.w * (1 - o * 0.15), cx = m.cx, cy = m.cy;
    const top = m.w * (0.12 + smile * 0.08) - o * m.w * 0.3;
    const bot = m.w * (0.3 + smile * 0.15) + o * m.w * 1.1;
    return `M${cx - w} ${cy} Q${cx} ${cy + top} ${cx + w} ${cy} Q${cx} ${cy + bot} ${cx - w} ${cy} Z`;
  }

  class Buddy {
    constructor(host, opts = {}) {
      this.host = host;
      this.happy = !!opts.happy;
      this.look = LOOKS[opts.look] ? opts.look : "me";
      this.m = LOOKS[this.look].mouth;
      host.innerHTML = svgMarkup(this.happy, this.look, !!opts.legs);
      this.svg = host.querySelector("svg");
      this.mouthShapes = host.querySelectorAll(".gad-mouth-shape");
      this.tongue = host.querySelector(".gad-tongue");
      this.pupils = host.querySelector(".gad-pupils");
      this.open = 0;          // current mouth openness 0..1
      this.target = 0;        // where the mouth wants to be
      this.level = () => 0;   // voice loudness source, swapped by the voice engine
      this.gaze = { x: 0, y: 0 };
      this.smile = 1;
      this._frame = this._frame.bind(this);
      requestAnimationFrame(this._frame);
      this._blinkLoop();
      window.addEventListener("pointermove", (e) => {
        const r = this.svg.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height * 0.48;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        const len = Math.max(1, Math.hypot(dx, dy));
        const k = Math.min(1, len / 300);
        this.gaze = { x: (dx / len) * 4.5 * k, y: (dy / len) * 3.5 * k };
      });
    }
    _frame() {
      const lvl = Math.max(0, Math.min(1, this.level()));
      this.target = lvl;
      const speed = this.target > this.open ? 0.55 : 0.3;
      this.open += (this.target - this.open) * speed;
      const d = mouthPath(this.m, this.open, this.smile);
      this.mouthShapes.forEach((p) => p.setAttribute("d", d));
      this.tongue.setAttribute("cy", this.m.cy + 10 + this.open * this.m.w * 0.9);
      this.pupils.setAttribute("transform", `translate(${this.gaze.x.toFixed(1)} ${this.gaze.y.toFixed(1)})`);
      this.host.classList.toggle("is-talking", this.open > 0.08);
      requestAnimationFrame(this._frame);
    }
    _blinkLoop() {
      const wait = 1800 + Math.random() * 3200;
      setTimeout(() => {
        this.host.classList.add("is-blinking");
        setTimeout(() => this.host.classList.remove("is-blinking"), 140);
        this._blinkLoop();
      }, wait);
    }
    mood(name) {
      this.host.dataset.mood = name || "";
    }
  }

  // ---------------------------------------------------------------------
  // Voice engine. Three ways to talk, best available wins:
  //   clips  - recorded mp3s in /audio (the cloned voice), lip synced to loudness
  //   speech - the browser's built-in text to speech as a stand-in
  //   silent - captions only, mouth flapping in time with the words
  // ---------------------------------------------------------------------
  // How fast the host talks. 1 is the recording as-is.
  const SPEED = (window.GAD_CONFIG && window.GAD_CONFIG.voiceSpeed) || 1;

  class Voice {
    constructor(buddy) {
      this.buddy = buddy;
      this.clips = null;    // id -> url, when recorded audio exists
      this.muted = true;
      this.ctx = null;
      this.analyser = null;
      this.audio = null;
      this.cancel = null;
    }
    async load() {
      try {
        const res = await fetch("audio/manifest.json", { cache: "no-cache" });
        if (res.ok) {
          const m = await res.json();
          if (m.clips && m.clips.length) {
            this.clips = {};
            m.clips.forEach((id) => { this.clips[id] = `audio/${id}.mp3`; });
          }
        }
      } catch (_) { /* no recorded voice yet */ }
    }
    get hasSpeech() { return "speechSynthesis" in window; }
    setMuted(m) {
      this.muted = m;
      if (m) this.stop();
    }
    stop() {
      if (this.cancel) this.cancel();
    }
    // Call from a click handler so mobile browsers allow audio.
    unlock() {
      if (this.clips && !this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          this.ctx = new AC();
          this.audio = new Audio();
          this.audio.preload = "auto";
          const src = this.ctx.createMediaElementSource(this.audio);
          this.analyser = this.ctx.createAnalyser();
          this.analyser.fftSize = 1024;
          src.connect(this.analyser);
          this.analyser.connect(this.ctx.destination);
        }
      }
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
      if (!this.clips && this.hasSpeech) {
        // A silent utterance inside the tap primes iOS Safari.
        const u = new SpeechSynthesisUtterance(" ");
        u.volume = 0;
        speechSynthesis.speak(u);
      }
    }
    say(id, text) {
      this.stop();
      return new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          this.buddy.level = () => 0;
          this.cancel = null;
          resolve();
        };
        if (!this.muted && this.clips && this.clips[id] && this.audio) {
          this._sayClip(this.clips[id], finish);
        } else if (!this.muted && !this.clips && this.hasSpeech) {
          this._saySpeech(text, finish);
        } else {
          this._saySilent(text, finish);
        }
      });
    }
    _sayClip(url, finish) {
      const a = this.audio, an = this.analyser;
      const buf = new Uint8Array(an.fftSize);
      this.buddy.level = () => {
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / buf.length);
        return rms < 0.02 ? 0 : Math.min(1, rms * 5);
      };
      const end = () => { a.onended = a.onerror = null; finish(); };
      a.onended = a.onerror = end;
      this.cancel = () => { a.pause(); end(); };
      a.src = url;
      a.playbackRate = SPEED;
      a.play().catch(end);
    }
    _saySpeech(text, finish) {
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = 1.7;
      u.rate = Math.min(2, 1.08 * SPEED);
      const v = pickVoice();
      if (v) u.voice = v;
      let bump = 0;
      const t0 = performance.now();
      this.buddy.level = () => {
        const t = (performance.now() - t0) / 1000;
        bump *= 0.9;
        return 0.25 + 0.55 * Math.abs(Math.sin(t * 11)) * (0.7 + 0.3 * Math.sin(t * 3.3)) + bump;
      };
      u.onboundary = () => { bump = 0.35; };
      const words = text.split(/\s+/).length;
      const guard = setTimeout(end, words * 650 + 3000);
      function end() { clearTimeout(guard); finish(); }
      u.onend = u.onerror = end;
      this.cancel = () => { u.onend = u.onerror = null; speechSynthesis.cancel(); end(); };
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    }
    _saySilent(text, finish) {
      const words = text.split(/\s+/).length;
      const dur = Math.max(1200, words * 330 / SPEED);
      const t0 = performance.now();
      this.buddy.level = () => {
        const t = (performance.now() - t0) / 1000;
        return 0.15 + 0.5 * Math.abs(Math.sin(t * 9));
      };
      const timer = setTimeout(finish, dur);
      this.cancel = () => { clearTimeout(timer); finish(); };
    }
  }

  let chosenVoice;
  function pickVoice() {
    if (chosenVoice !== undefined) return chosenVoice;
    const vs = speechSynthesis.getVoices();
    if (!vs.length) return null;
    const en = vs.filter((v) => /^en/i.test(v.lang));
    const prefs = [/Google US English/i, /Samantha/i, /Aaron/i, /Junior/i, /Daniel/i, /en-US/i];
    for (const p of prefs) {
      const hit = en.find((v) => p.test(v.name) || p.test(v.lang));
      if (hit) return (chosenVoice = hit);
    }
    return (chosenVoice = en[0] || vs[0]);
  }
  if ("speechSynthesis" in window) {
    speechSynthesis.onvoiceschanged = () => { chosenVoice = undefined; };
  }

  // ---------------------------------------------------------------------
  // The monologue: plays a list in order, then shuffles another list forever.
  // ---------------------------------------------------------------------
  class Monologue {
    constructor({ buddy, voice, bubble, first, rest }) {
      Object.assign(this, { buddy, voice, bubble, first, rest });
      this.queue = first.slice();
      this.interrupt = null;
      this.running = false;
      this.gen = 0;
    }
    _next() {
      if (this.interrupt) { const l = this.interrupt; this.interrupt = null; return l; }
      if (!this.queue.length) {
        const pool = this.rest.slice();
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        this.queue = pool;
      }
      return this.queue.shift();
    }
    start() {
      if (this.running) return;
      this.running = true;
      this._loop(++this.gen);
    }
    restart(fromTop) {
      if (fromTop) { this.queue = this.first.slice(); this.interrupt = null; }
      this.voice.stop();
      this.running = false;
      this.start();
    }
    say(line) {
      this.interrupt = line;
      this.voice.stop();
    }
    async _loop(gen) {
      while (this.running && gen === this.gen) {
        const [id, text] = this._next();
        this.bubble.textContent = text;
        this.bubble.parentElement.classList.remove("pop");
        void this.bubble.offsetWidth;
        this.bubble.parentElement.classList.add("pop");
        await this.voice.say(id, text);
        if (gen !== this.gen) return;
        await new Promise((r) => setTimeout(r, this.interrupt ? 50 : Math.round(650 / SPEED)));
      }
    }
  }

  window.GAD = { Buddy, Voice, Monologue };
})();
