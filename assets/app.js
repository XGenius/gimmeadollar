// Page wiring shared by the home page and the thank-you page.
(function () {
  const cfg = window.GAD_CONFIG;
  const S = window.GAD_SCRIPT;
  const page = document.body.dataset.page; // "home" | "thanks"
  const url = cfg.siteUrl;

  // Which host look this visitor sees: ?look= wins, then their split-test slot, then the default.
  const LOOKS = ["me", "shades", "natural", "generic", "tiedye"];
  function pickLook() {
    const store = (v) => { try { if (v) localStorage.setItem("gad-look", v); return v || localStorage.getItem("gad-look"); } catch (_) { return v; } };
    const asked = new URLSearchParams(location.search).get("look");
    if (LOOKS.includes(asked)) return store(asked);
    const pool = (cfg.lookTest || []).filter((l) => LOOKS.includes(l));
    if (!pool.length) return cfg.character;
    const kept = store();
    return pool.includes(kept) ? kept : store(pool[Math.floor(Math.random() * pool.length)]);
  }
  const look = pickLook();
  document.body.dataset.look = look;
  const buddy = new GAD.Buddy(document.getElementById("buddy"), { happy: page === "thanks", look });
  const voice = new GAD.Voice(buddy);
  const bubble = document.getElementById("bubble-text");
  const show = page === "thanks"
    ? { first: S.thanks, rest: S.thanks.slice(2).concat(S.extra.filter(([id]) => ["x06", "x12", "x15", "x20"].includes(id))) }
    : { first: S.intro, rest: S.extra };
  const mono = new GAD.Monologue({ buddy, voice, bubble, first: show.first, rest: show.rest });

  // Sound toggle. The host mouths along with captions until someone turns the sound on.
  const soundBtn = document.getElementById("sound");
  const startBtn = document.getElementById("start");
  function setSound(on) {
    voice.setMuted(!on);
    soundBtn.setAttribute("aria-pressed", String(on));
    soundBtn.querySelector(".lbl").textContent = on ? "Sound on" : "Sound off";
    document.body.classList.toggle("sound-on", on);
    if (startBtn) startBtn.hidden = on;
  }
  let heard = false;
  function turnOn() {
    voice.unlock();
    setSound(true);
    mono.restart(!heard);
    heard = true;
  }
  soundBtn.addEventListener("click", () => {
    if (voice.muted) turnOn(); else setSound(false);
  });
  if (startBtn) startBtn.addEventListener("click", turnOn);

  // Sound on by default. Browsers won't play audio until the visitor interacts,
  // so the first tap, click or key press anywhere on the page starts the pitch.
  if (cfg.soundOnByDefault) {
    const kinds = ["click", "touchend", "keydown"];
    const wake = (e) => {
      kinds.forEach((k) => document.removeEventListener(k, wake, true));
      // The sound and start buttons handle themselves; let them.
      if (e.target.closest && e.target.closest("#sound, #start")) return;
      if (voice.muted && !heard) turnOn();
    };
    kinds.forEach((k) => document.addEventListener(k, wake, true));
  }

  voice.load().then(() => mono.start());

  // Pay buttons open the "How many dollars?" pop-up; each card goes to its own Stripe link.
  // The look rides along to Stripe as client_reference_id so payments can be counted per look.
  const checkoutUrl = (href) => {
    const link = new URL(href);
    link.searchParams.set("client_reference_id", `look-${look}`);
    return link.toString();
  };
  const packs = (cfg.packages || []).filter((p) => p.link);
  if (packs.length) {
    const d = document.createElement("dialog");
    d.id = "dlg-pick";
    d.className = "pick";
    d.setAttribute("aria-labelledby", "pick-title");
    d.innerHTML = `<button class="btn x" type="button" data-close aria-label="Close"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
      <h2 id="pick-title">How many dollars?</h2>
      <p class="pick-sub">One is great. More is greater. Buy in bulk and save. I'm told that's how business works.</p>
      <div class="packs">${packs.map((p) => `<div class="pack${p.ribbon ? " best" : ""}">
        ${p.ribbon ? `<span class="ribbon">${p.ribbon}</span>` : ""}
        <div class="pack-name">${p.name}</div>
        <div class="pack-gets">${p.gets}</div>
        <div class="pack-price"><small>$</small>${p.price}</div>
        <div class="pack-was">${p.was}</div>
        <p class="pack-blurb">${p.blurb}</p>
        <a class="btn pack-go" href="${checkoutUrl(p.link)}">${p.cta}</a>
      </div>`).join("")}</div>
      <p class="pick-fine">Discounts apply to dollars only. Dollars apply to me only. All sales are final because you get nothing in return.</p>`;
    document.body.appendChild(d);
  }
  document.querySelectorAll("[data-pay]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (packs.length) openDialog("pick");
      else if (cfg.paymentLink) window.location.href = checkoutUrl(cfg.paymentLink);
      else openDialog("soon");
    });
    let lastHover = 0;
    btn.addEventListener("pointerenter", () => {
      buddy.mood("excited");
      const now = Date.now();
      if (now - lastHover > 8000 && S.hover) {
        lastHover = now;
        mono.say(S.hover[Math.floor(Math.random() * S.hover.length)]);
      }
    });
    btn.addEventListener("pointerleave", () => buddy.mood(""));
  });

  // Dialogs.
  function openDialog(name) {
    const d = document.getElementById(`dlg-${name}`);
    if (!d) return;
    if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
  }
  document.querySelectorAll("[data-open]").forEach((b) =>
    b.addEventListener("click", () => openDialog(b.dataset.open)));
  document.querySelectorAll("dialog").forEach((d) => {
    d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
    d.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => d.close()));
  });

  // Tell three friends.
  const paid = page === "thanks";
  const msg = paid
    ? "I just gave a dollar to a silly guy who would not stop asking. Now it's your turn. Then tell three friends."
    : "There's a silly guy on this website who will not stop asking me for one dollar. Go see.";
  const subject = paid ? "I gave it a dollar. Your turn." : "This silly guy wants a dollar from you";

  let told = 0;
  try { told = Math.min(3, parseInt(localStorage.getItem("gad-told") || "0", 10) || 0); } catch (_) {}
  function renderFriends() {
    document.querySelectorAll(".friends").forEach((wrap) => {
      wrap.querySelectorAll(".friend").forEach((f, i) => f.classList.toggle("done", i < told));
      const note = wrap.parentElement.querySelector(".friends-note");
      if (note) {
        note.textContent = told >= 3
          ? "Three friends told. You are a legend. Tell more if you want."
          : `${3 - told} to go.`;
      }
    });
  }
  function bump() {
    told = Math.min(3, told + 1);
    try { localStorage.setItem("gad-told", String(told)); } catch (_) {}
    renderFriends();
    if (told === 3) buddy.mood("excited");
  }
  renderFriends();

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const t = document.createElement("textarea");
      t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } catch (_) {}
      t.remove();
    }
  }
  const e = encodeURIComponent;
  const SOCIAL = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`,
    x: `https://x.com/intent/tweet?text=${e(msg)}&url=${e(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}`,
  };

  document.querySelectorAll("[data-share]").forEach((b) => {
    const kind = b.dataset.share;
    if (kind === "native" && !navigator.share) { b.hidden = true; return; }
    b.addEventListener("click", async () => {
      if (kind === "native") {
        try { await navigator.share({ title: "Gimme A Dollar", text: msg, url }); bump(); } catch (_) {}
      } else if (kind === "sms") {
        window.location.href = `sms:?&body=${encodeURIComponent(`${msg} ${url}`)}`;
        bump();
      } else if (kind === "email") {
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${msg}\n\n${url}`)}`;
        bump();
      } else if (SOCIAL[kind]) {
        // Facebook and LinkedIn ignore any text passed in the share link, so copy the
        // message (with the link) first and tell them to paste it. Started before the
        // popup opens, while this page still has focus.
        if (kind !== "x") {
          copyText(`${msg} ${url}`);
          const note = b.closest(".socials") && b.closest(".socials").querySelector(".socials-note");
          const where = kind === "facebook" ? "Facebook" : "LinkedIn";
          if (note) note.textContent = `Message copied. Paste it into your ${where} post.`;
        }
        // "noopener" would make window.open return null, so cut the link to this page by hand.
        const w = window.open(SOCIAL[kind], "_blank", "width=620,height=680");
        if (w) w.opener = null; else window.location.href = SOCIAL[kind];
        bump();
      } else if (kind === "instagram") {
        // Instagram has no web share link. On phones, share the picture and let them pick
        // Instagram from the share sheet; everywhere else, copy the link for their story or bio.
        const note = b.closest(".socials") && b.closest(".socials").querySelector(".socials-note");
        try {
          const blob = await (await fetch("assets/og.png")).blob();
          const file = new File([blob], "gimmeadollar.png", { type: "image/png" });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], text: `${msg} ${url}` });
            bump();
            return;
          }
        } catch (err) {
          if (err && err.name === "AbortError") return;
        }
        await copyText(url);
        if (note) note.textContent = "Link copied. Paste it into your Instagram story or bio.";
        bump();
      } else if (kind === "copy") {
        await copyText(url);
        const note = b.closest(".socials") && b.closest(".socials").querySelector(".socials-note");
        if (note) note.textContent = "Link copied.";
        const lbl = b.querySelector(".lbl");
        const old = lbl.textContent;
        lbl.textContent = "Copied";
        setTimeout(() => { lbl.textContent = old; }, 1600);
        bump();
      }
    });
  });

  // The "13 rounds" math on the home page.
  const ladder = document.getElementById("ladder");
  if (ladder) {
    let total = 1, people = 1;
    const max = Math.log10(Math.pow(3, 13));
    for (let r = 1; r <= 13; r++) {
      people *= 3;
      total += people;
      const row = document.createElement("li");
      const w = Math.max(4, (Math.log10(people) / max) * 100);
      row.innerHTML = `<span class="r">Round ${r}</span><span class="bar"><i style="width:${w.toFixed(1)}%"></i></span><span class="n">${people.toLocaleString("en-US")}</span>`;
      if (total >= 1e6 && !ladder.querySelector(".made-it")) row.classList.add("made-it");
      ladder.appendChild(row);
    }
    const t = document.getElementById("ladder-total");
    if (t) t.textContent = `$${total.toLocaleString("en-US")}`;
  }

  // Millionaire meter: live dollars given, from the Worker at /api/meter.
  let meterDollars = 0;
  const meterEl = document.getElementById("meter");
  if (meterEl) {
    const fill = meterEl.querySelector(".meter-bar i");
    const bar = document.getElementById("meter-bar");
    const amount = document.getElementById("meter-dollars");
    const note = document.getElementById("meter-note");
    const money = (n) => `$${n.toLocaleString("en-US")}`;
    let shown = 0;
    function countTo(target) {
      const from = shown, start = performance.now(), ms = 1200;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      function step(now) {
        const p = reduce ? 1 : Math.min(1, (now - start) / ms);
        shown = Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3)));
        amount.textContent = money(shown);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    async function loadMeter() {
      try {
        const res = await fetch("/api/meter", { cache: "no-store" });
        if (!res.ok) throw new Error(`meter HTTP ${res.status}`);
        const { dollars, goal } = await res.json();
        meterDollars = dollars;
        // A sliver stays visible once anyone has given, so the first dollar shows up.
        const pct = dollars > 0 ? Math.max(1.5, Math.min(100, (dollars / goal) * 100)) : 0;
        fill.style.width = `${pct}%`;
        bar.setAttribute("aria-valuenow", String(dollars));
        note.textContent = dollars === 0 ? "given so far. Be the first."
          : dollars >= goal ? "given. I am a millionaire!"
          : `given so far. ${money(goal - dollars)} to go.`;
        meterEl.hidden = false;
        countTo(dollars);
      } catch (err) {
        console.error("Millionaire meter failed to load", err);
      }
    }
    loadMeter();
    setInterval(() => { if (!document.hidden) loadMeter(); }, 60000);
  }

  // Notify Me: "tell me when the meter reaches $X and I will give you a dollar then."
  const form = document.getElementById("notify-form");
  if (form) {
    const amountIn = document.getElementById("notify-amount");
    const msgEl = document.getElementById("notify-msg");
    const done = document.getElementById("notify-done");
    const dlg = document.getElementById("dlg-notify");
    const money = (n) => `$${n.toLocaleString("en-US")}`;
    const parse = () => Math.round(Number(amountIn.value.replace(/[$,\s]/g, "")));
    amountIn.addEventListener("input", () => {
      const n = parse();
      msgEl.textContent = Number.isFinite(n) && n >= 1 && n <= meterDollars
        ? `The meter is already past ${money(n)}. So, gimme a dollar now?`
        : "";
    });
    dlg.addEventListener("close", () => {
      if (!done.hidden) { done.hidden = true; form.hidden = false; form.reset(); msgEl.textContent = ""; }
    });
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const amount = parse();
      const email = form.email.value.trim();
      if (!Number.isFinite(amount) || amount < 1 || amount > 1000000) {
        msgEl.textContent = "Pick a whole dollar amount between $1 and $1,000,000.";
        amountIn.focus();
        return;
      }
      if (!form.email.checkValidity() || !email) {
        msgEl.textContent = "That email address does not look right.";
        form.email.focus();
        return;
      }
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      msgEl.textContent = "Saving...";
      try {
        const res = await fetch("/api/notify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, amount, website: form.website.value }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Something went wrong. Try again?");
        document.getElementById("notify-done-text").textContent =
          `I will email you when the Millionaire Meter hits ${money(amount)}. Then you owe me a dollar. I will remember.`;
        form.hidden = true;
        done.hidden = false;
        buddy.mood("excited");
        setTimeout(() => buddy.mood(""), 2500);
      } catch (err) {
        msgEl.textContent = err.message;
      } finally {
        btn.disabled = false;
      }
    });
  }
})();
