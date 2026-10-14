// Millionaire meter backend. Everything else on the site is static assets;
// only /api/* reaches this script (see run_worker_first in wrangler.jsonc).
//
//   GET  /api/meter          -> { dollars, gifts, goal }   (cached 30s at the edge)
//   POST /api/stripe-webhook <- Stripe checkout events for the payment links
//   POST /api/stripe-webhook/<token> <- same, for an endpoint whose URL carries a
//        random token instead of a signing secret (only its SHA-256 is in this repo)
//   POST /api/notify         <- { email, amount }: "notify me when the meter reaches $amount"
//
// Notify Me signups are stored in the same Durable Object. When the RESEND_API_KEY
// secret is set, each signup is also added to Resend as a contact (custom property
// notify_at = the amount) in the "Gimme A Dollar" segment. Signups saved before the
// key existed are synced by the cron trigger, so nothing is lost while it is missing.
//
// Each paid checkout session is stored once in a SQLite Durable Object, so
// Stripe retries and duplicate deliveries never double count.

import { DurableObject } from "cloudflare:workers";

const GOAL_DOLLARS = 1_000_000;
// Stripe docs (docs.stripe.com/webhooks/signatures): official libraries default
// to a 5 minute tolerance between the signed timestamp and server time.
const TOLERANCE_SECONDS = 300;
// Paid before the webhook existed, so Stripe never told the meter about them.
// Checked against Stripe's own record of completed checkout sessions.
const EARLY_GIFTS = [
  ["cs_live_a1dQw3uLUfPguskBaWWvAZGkcPqrwnyZBMuqhhgImapyaxkx3mpruzNZIw", 100, 1791935995],
];
const COUNTED_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

export class Meter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS gifts (
      session_id TEXT PRIMARY KEY,
      amount_cents INTEGER NOT NULL,
      created INTEGER NOT NULL
    )`);
    ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS signups (
      email TEXT NOT NULL,
      amount INTEGER NOT NULL,
      created INTEGER NOT NULL,
      ip_hash TEXT,
      synced INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (email, amount)
    )`);
    ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)`);
  }

  // Returns "saved", "duplicate" or "slow down".
  addSignup(email, amount, ipHash) {
    const now = Math.floor(Date.now() / 1000);
    const recent = this.ctx.storage.sql
      .exec("SELECT COUNT(*) AS n FROM signups WHERE ip_hash = ? AND created > ?", ipHash, now - 3600)
      .one().n;
    if (recent >= SIGNUPS_PER_IP_PER_HOUR) return "slow down";
    const cur = this.ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO signups (email, amount, created, ip_hash) VALUES (?, ?, ?, ?)",
      email, amount, now, ipHash,
    );
    return cur.rowsWritten > 0 ? "saved" : "duplicate";
  }

  // One row per email, holding the lowest amount that email is still waiting on.
  unsynced(limit) {
    return this.ctx.storage.sql
      .exec(`SELECT email, MIN(amount) AS amount FROM signups
             WHERE email IN (SELECT email FROM signups WHERE synced = 0)
             GROUP BY email LIMIT ?`, limit)
      .toArray();
  }

  markSynced(email) {
    this.ctx.storage.sql.exec("UPDATE signups SET synced = 1 WHERE email = ?", email);
  }

  getKv(k) {
    const rows = this.ctx.storage.sql.exec("SELECT v FROM kv WHERE k = ?", k).toArray();
    return rows.length ? rows[0].v : null;
  }

  setKv(k, v) {
    this.ctx.storage.sql.exec("INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)", k, v);
  }

  signupStats() {
    return this.ctx.storage.sql
      .exec("SELECT COUNT(DISTINCT email) AS people, COUNT(*) AS signups, COALESCE(SUM(synced = 0), 0) AS unsynced FROM signups")
      .one();
  }

  // Returns true when the session was new and got counted.
  record(sessionId, amountCents, created) {
    const cur = this.ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO gifts (session_id, amount_cents, created) VALUES (?, ?, ?)",
      sessionId, amountCents, created,
    );
    return cur.rowsWritten > 0;
  }

  totals() {
    for (const [id, cents, created] of EARLY_GIFTS) this.record(id, cents, created);
    const row = this.ctx.storage.sql
      .exec("SELECT COUNT(*) AS gifts, COALESCE(SUM(amount_cents), 0) AS cents FROM gifts")
      .one();
    return { gifts: row.gifts, cents: row.cents };
  }
}

const meter = (env) => env.METER.getByName("global");

const SIGNUPS_PER_IP_PER_HOUR = 10;
const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]{2,}$/;
const RESEND = "https://api.resend.com";
const SEGMENT_NAME = "Gimme A Dollar";

async function resend(env, method, path, body) {
  const res = await fetch(`${env.RESEND_API_BASE || RESEND}${path}`, {
    method,
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (_) {}
  return { ok: res.ok, status: res.status, data, text };
}

// The "notify_at" contact property and the segment are created once, then remembered.
async function resendSetup(env, m) {
  if (!(await m.getKv("resend_property"))) {
    const r = await resend(env, "POST", "/contact-properties", { key: "notify_at", type: "number" });
    // Already existing is fine; anything else is logged and retried next time.
    if (!r.ok && !/exist/i.test(r.text)) throw new Error(`resend contact-properties ${r.status}: ${r.text}`);
    await m.setKv("resend_property", "1");
  }
  let segment = env.RESEND_SEGMENT_ID || (await m.getKv("resend_segment"));
  if (!segment) {
    const list = await resend(env, "GET", "/segments");
    const found = list.ok && list.data && (list.data.data || []).find((x) => x.name === SEGMENT_NAME);
    if (found) segment = found.id;
    else {
      const r = await resend(env, "POST", "/segments", { name: SEGMENT_NAME });
      if (!r.ok) throw new Error(`resend segments ${r.status}: ${r.text}`);
      segment = r.data.id;
    }
    await m.setKv("resend_segment", segment);
  }
  return segment;
}

// Pushes unsynced signups to Resend. Does nothing until RESEND_API_KEY is set.
async function syncSignups(env, limit = 25) {
  if (!env.RESEND_API_KEY) return { skipped: "no RESEND_API_KEY" };
  const m = meter(env);
  const rows = await m.unsynced(limit);
  if (!rows.length) return { synced: 0 };
  const segment = await resendSetup(env, m);
  let synced = 0;
  for (const { email, amount } of rows) {
    const contact = { email, unsubscribed: false, properties: { notify_at: amount } };
    let r = await resend(env, "POST", "/contacts", contact);
    if (!r.ok && (r.status === 409 || /exist/i.test(r.text))) {
      r = await resend(env, "PATCH", `/contacts/${encodeURIComponent(email)}`, { properties: { notify_at: amount } });
    }
    if (!r.ok) { console.error(JSON.stringify({ msg: "resend contact failed", status: r.status, body: r.text })); continue; }
    const seg = await resend(env, "POST", `/contacts/${encodeURIComponent(email)}/segments/${segment}`);
    if (!seg.ok && !/exist|already/i.test(seg.text)) {
      console.error(JSON.stringify({ msg: "resend segment add failed", status: seg.status, body: seg.text }));
      continue;
    }
    await m.markSynced(email);
    synced++;
  }
  return { synced };
}

async function handleNotify(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch (_) { return json({ error: "Send JSON." }, 400); }
  // Bots fill in every field, including the hidden one people never see.
  if (body.website) return json({ ok: true });
  const email = String(body.email || "").trim().toLowerCase();
  const amount = Math.round(Number(String(body.amount ?? "").replace(/[$,\s]/g, "")));
  if (email.length > 254 || !EMAIL_RE.test(email)) return json({ error: "That email address does not look right." }, 400);
  if (!Number.isFinite(amount) || amount < 1 || amount > GOAL_DOLLARS) {
    return json({ error: "Pick a whole dollar amount between $1 and $1,000,000." }, 400);
  }
  const ip = request.headers.get("cf-connecting-ip") || "";
  const ipHash = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`gad:${ip}`))).slice(0, 32);
  const result = await meter(env).addSignup(email, amount, ipHash);
  if (result === "slow down") return json({ error: "Easy there. Try again in a bit." }, 429);
  console.log(JSON.stringify({ msg: "notify signup", amount, result }));
  ctx.waitUntil(syncSignups(env).catch((err) => console.error(JSON.stringify({ msg: "resend sync failed", err: String(err) }))));
  return json({ ok: true, amount });
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time comparison of two equal-length hex strings.
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Stripe docs (docs.stripe.com/webhooks, "Verify webhook signatures manually"):
// HMAC-SHA256 with the endpoint secret over `${t}.${rawBody}`, compared against
// every v1 signature in the Stripe-Signature header.
async function verifyStripe(rawBody, header, secret) {
  if (!header || !secret) return false;
  let t = null;
  const v1 = [];
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k === "t") t = v;
    else if (k === "v1") v1.push(v);
  }
  if (!t || !v1.length || !/^\d+$/.test(t)) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > TOLERANCE_SECONDS) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${rawBody}`)));
  return v1.some((sig) => safeEqual(sig, expected));
}

// The endpoint Stripe calls can carry a long random token in its path. Only
// Stripe knows the full URL; the repo holds just the token's SHA-256.
async function tokenOk(token, env) {
  if (!token || !env.HOOK_TOKEN_SHA256) return false;
  const digest = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
  return safeEqual(digest, env.HOOK_TOKEN_SHA256);
}

async function handleWebhook(request, env, token) {
  const raw = await request.text();
  const ok = token
    ? await tokenOk(token, env)
    : await verifyStripe(raw, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) {
    console.warn(JSON.stringify({ msg: "stripe webhook rejected: bad signature" }));
    return json({ error: "bad signature" }, 400);
  }
  const event = JSON.parse(raw);
  const s = event.data && event.data.object;
  if (!COUNTED_EVENTS.has(event.type) || !s) return json({ ignored: event.type });
  // The Stripe account only sells gifts to this silly guy, so every Payment Link on it
  // counts (the pay-per-dollar link, the 10 and 100 dollar packages, any future ones).
  // PAYMENT_LINK_IDS can narrow that to a comma separated list if that ever changes.
  const links = String(env.PAYMENT_LINK_IDS || "*").split(",").map((x) => x.trim());
  if (!s.payment_link || (!links.includes("*") && !links.includes(s.payment_link))) {
    return json({ ignored: "not a payment link checkout" });
  }
  if (s.payment_status !== "paid") return json({ ignored: `payment_status ${s.payment_status}` });
  if (s.currency !== "usd" || !Number.isInteger(s.amount_total)) {
    console.error(JSON.stringify({ msg: "stripe webhook: unexpected amount", session: s.id, currency: s.currency, amount_total: s.amount_total }));
    return json({ ignored: "unexpected amount" });
  }
  const counted = await meter(env).record(s.id, s.amount_total, s.created);
  console.log(JSON.stringify({ msg: "gift", session: s.id, cents: s.amount_total, counted }));
  return json({ counted });
}

async function handleMeter(request, env, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(new URL("/api/meter", request.url).toString());
  const hit = await cache.match(cacheKey);
  if (hit) return hit;
  const { gifts, cents } = await meter(env).totals();
  const res = json(
    { dollars: Math.floor(cents / 100), gifts, goal: GOAL_DOLLARS },
    200,
    { "cache-control": "public, max-age=30" },
  );
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/meter" && request.method === "GET") return handleMeter(request, env, ctx);
    if (pathname === "/api/stripe-webhook" && request.method === "POST") return handleWebhook(request, env);
    if (pathname.startsWith("/api/stripe-webhook/") && request.method === "POST") {
      return handleWebhook(request, env, pathname.slice("/api/stripe-webhook/".length));
    }
    if (pathname === "/api/notify" && request.method === "POST") return handleNotify(request, env, ctx);
    if (pathname.startsWith("/api/")) return json({ error: "not found" }, 404);
    return env.ASSETS.fetch(request);
  },

  // Catches up on signups saved while Resend was unreachable or not set up yet.
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      try {
        const res = await syncSignups(env, 100);
        const stats = await meter(env).signupStats();
        console.log(JSON.stringify({ msg: "notify sync", ...res, ...stats }));
      } catch (err) {
        console.error(JSON.stringify({ msg: "resend sync failed", err: String(err) }));
      }
    })());
  },
};
