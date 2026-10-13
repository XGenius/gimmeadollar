// Millionaire meter backend. Everything else on the site is static assets;
// only /api/* reaches this script (see run_worker_first in wrangler.jsonc).
//
//   GET  /api/meter          -> { dollars, gifts, goal }   (cached 30s at the edge)
//   POST /api/stripe-webhook <- Stripe checkout events for the $1 payment link
//
// Each paid checkout session is stored once in a SQLite Durable Object, so
// Stripe retries and duplicate deliveries never double count.

import { DurableObject } from "cloudflare:workers";

const GOAL_DOLLARS = 1_000_000;
// Stripe docs (docs.stripe.com/webhooks/signatures): official libraries default
// to a 5 minute tolerance between the signed timestamp and server time.
const TOLERANCE_SECONDS = 300;
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
    const row = this.ctx.storage.sql
      .exec("SELECT COUNT(*) AS gifts, COALESCE(SUM(amount_cents), 0) AS cents FROM gifts")
      .one();
    return { gifts: row.gifts, cents: row.cents };
  }
}

const meter = (env) => env.METER.getByName("global");

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

async function handleWebhook(request, env) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.error(JSON.stringify({ msg: "stripe webhook: STRIPE_WEBHOOK_SECRET is not set" }));
    return json({ error: "not configured" }, 500);
  }
  const raw = await request.text();
  const ok = await verifyStripe(raw, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) {
    console.warn(JSON.stringify({ msg: "stripe webhook rejected: bad signature" }));
    return json({ error: "bad signature" }, 400);
  }
  const event = JSON.parse(raw);
  const s = event.data && event.data.object;
  if (!COUNTED_EVENTS.has(event.type) || !s) return json({ ignored: event.type });
  if (s.payment_link !== env.PAYMENT_LINK_ID) return json({ ignored: "other payment link" });
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
    if (pathname.startsWith("/api/")) return json({ error: "not found" }, 404);
    return env.ASSETS.fetch(request);
  },
};
