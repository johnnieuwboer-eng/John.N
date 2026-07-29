// Production server for the built site. The TanStack Start build emits a portable
// fetch handler (dist/server/server.js) plus static client assets (dist/client);
// this wraps them in a Bun server on port 3000 — static files first, SSR for the
// rest. Run `bun run build` before starting. Restart it with `bun run publish`.
//
// Starting a new instance supersedes the old one: it frees the port no matter
// which user owns the current server (provisioning starts it as `engine`; a team
// member's `bun run publish` runs as their own user), so publish never collides
// with an already-running server. Every sandbox user has passwordless sudo, so
// the takeover works across user boundaries.
import handler from "./dist/server/server.js";
import { getCookieStatus, signValue } from "./src/lib/cookies.server.ts";
import { callLLM, mockReport } from "./src/lib/llm";
import type { Report } from "./src/lib/llm";

// Pinned, NOT read from the environment. The published preview URL
// (<label>.<PUBLIC_SITE_DOMAIN>) is reverse-proxied to 0.0.0.0:3000 inside the
// sandbox, so the default site MUST bind there. Bun auto-loads .env files, so
// honouring process.env.PORT/HOST would let a stray env var or a .env in the site
// dir silently move the site off :3000 (or onto loopback) and break the public URL.
const PORT = 3000;
const HOST = "0.0.0.0";
const CLIENT_DIR = `${import.meta.dir}/dist/client`;

// Free PORT regardless of which user owns the current listener.
const freePort =
  `for _ in $(seq 1 25); do ` +
  `pids=$(lsof -t -iTCP:${String(PORT)} -sTCP:LISTEN 2>/dev/null || true); ` +
  `if [ -z "$pids" ]; then exit 0; fi; ` +
  `kill $pids 2>/dev/null || true; sleep 0.2; ` +
  `done`;

// ── Utility helpers ─────────────────────────────────────────────────────────────

/** Extract the client IP from request headers. */
function getIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ── Rate limiting (token bucket per IP) ─────────────────────────────────────────

const rateLimitMap = new Map<string, { tokens: number; lastRefill: number }>();

function checkRateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  let bucket = rateLimitMap.get(ip);
  if (!bucket) {
    bucket = { tokens: maxRequests - 1, lastRefill: now };
    rateLimitMap.set(ip, bucket);
    return true;
  }
  // Refill tokens proportionally based on elapsed time
  const elapsed = now - bucket.lastRefill;
  const refill = Math.floor(elapsed / windowMs) * maxRequests;
  if (refill > 0) {
    bucket.tokens = Math.min(maxRequests, bucket.tokens + refill);
    bucket.lastRefill = now;
  }
  if (bucket.tokens > 0) {
    bucket.tokens--;
    return true;
  }
  return false;
}

// Periodic cleanup of stale rate-limit entries (every 10 min, remove >2h idle)
setInterval(() => {
  const cutoff = Date.now() - 2 * 3600000;
  for (const [ip, bucket] of rateLimitMap) {
    if (bucket.lastRefill < cutoff) rateLimitMap.delete(ip);
  }
}, 600000).unref();

// ── Paid-endpoint rate limiting ─────────────────────────────────────────────────

const paidAttempts = new Map<string, { count: number; resetAt: number }>();

// ── Security headers wrapper ────────────────────────────────────────────────────

function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  // CSP report-only for now (avoids breaking while monitoring violations)
  headers.set(
    "Content-Security-Policy-Report-Only",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://js.stripe.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "connect-src 'self' https://api.openrouter.ai; " +
      "frame-src https://js.stripe.com https://hooks.stripe.com; " +
      "img-src 'self' data:",
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ── In-memory stats counter ────────────────────────────────────────────────────

let reportsGenerated = 0;

// ── In-memory partial report session store (30-min TTL) ────────────────────────

interface SessionEntry {
  report: Report;
  expiresAt: number;
}

const sessionStore = new Map<string, SessionEntry>();

// Cleanup expired sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of sessionStore) {
    if (entry.expiresAt < now) sessionStore.delete(id);
  }
}, 300000).unref();

// ── Report generation helper ──────────────────────────────────────────────────

async function runReport(idea: string) {
  const apiKey = process.env.LLM_API_KEY;
  if (apiKey) {
    const baseUrl = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.LLM_MODEL || "gpt-4o-mini";
    return await callLLM(idea, apiKey, baseUrl, model);
  }
  return mockReport(idea);
}

// ── API handlers ─────────────────────────────────────────────────────────────

async function handleAnalyze(req: Request): Promise<Response> {
  // Enforce body size limit at the handler level too (belt and suspenders)
  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > 64 * 1024) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: { idea?: string };
  try {
    body = (await req.json()) as { idea?: string };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.idea || typeof body.idea !== "string" || body.idea.trim().length < 20) {
    return Response.json(
      { error: "Please provide a more detailed idea (at least 20 characters)." },
      { status: 400 },
    );
  }

  const status = getCookieStatus(req);
  const paymentLink = process.env.STRIPE_PAYMENT_LINK || "#";

  // Rate limit: 30/hr for paid, 5/hr for free
  const ip = getIP(req);
  const limit = status.hasPaid ? 30 : 5;
  if (!checkRateLimit(ip, limit, 3600000)) {
    return Response.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 },
    );
  }

  // ── Paid user: full report, no restrictions ───────────────────────────────
  if (status.hasPaid) {
    try {
      const report = await runReport(body.idea.trim());
      reportsGenerated++;
      return Response.json({ report, paymentLink });
    } catch (err) {
      console.error("Report generation failed:", err);
      return Response.json({ error: "Failed to generate report." }, { status: 500 });
    }
  }

  // ── First-time free user: full report + set free cookie ───────────────────
  if (!status.hasFree) {
    try {
      const report = await runReport(body.idea.trim());
      reportsGenerated++;
      const cookieVal = signValue("1");
      return Response.json({ report, setFreeCookie: cookieVal, paymentLink });
    } catch (err) {
      console.error("Report generation failed:", err);
      return Response.json({ error: "Failed to generate report." }, { status: 500 });
    }
  }

  // ── Returning free user (no paid): partial report tease ───────────────────
  try {
    const fullReport = await runReport(body.idea.trim());
    reportsGenerated++;

    // Generate a session ID and store the full report (30-min TTL)
    const sessionId = crypto.randomUUID();
    sessionStore.set(sessionId, {
      report: fullReport,
      expiresAt: Date.now() + 30 * 60_000,
    });

    // Build a partial report: scores + verdicts only, no analysis/experiment text
    const partialReport = {
      overallScore: fullReport.overallScore,
      summary: fullReport.summary,
      angles: fullReport.angles.map((a) => ({
        name: a.name,
        score: a.score,
        verdict: a.verdict,
      })),
    };

    return Response.json({
      partial: true,
      partialReport,
      sessionId,
      paymentLink,
      message:
        "You've used your free analysis. Here's a preview — unlock the full report for €9.99.",
    });
  } catch (err) {
    console.error("Report generation failed:", err);
    return Response.json({ error: "Failed to generate report." }, { status: 500 });
  }
}

async function handlePaid(req: Request): Promise<Response> {
  const ip = getIP(req);
  const now = Date.now();

  // Rate limit: max 3 POSTs per hour per IP
  const record = paidAttempts.get(ip);
  if (record && record.resetAt > now && record.count >= 3) {
    return Response.json({ error: "Too many attempts" }, { status: 429 });
  }
  if (!record || record.resetAt <= now) {
    paidAttempts.set(ip, { count: 1, resetAt: now + 3600000 });
  } else {
    record.count++;
  }

  // Must have a valid free cookie — proves they actually used the product
  const status = getCookieStatus(req);
  if (!status.hasFree) {
    console.log(
      `[SECURITY] /api/paid called without free cookie — IP: ${ip} at ${new Date().toISOString()}`,
    );
    return Response.json(
      { error: "No free report found. Analyze an idea first." },
      { status: 400 },
    );
  }

  // Audit log
  console.log(
    `[AUDIT] /api/paid issued — IP: ${ip} at ${new Date().toISOString()}`,
  );

  // Include timestamp so we can detect stale cookies later
  const paidValue = `1:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
  return Response.json({ paidCookie: signValue(paidValue) });
}

async function handleStats(_req: Request): Promise<Response> {
  return Response.json({ reportsGenerated });
}

async function handleGetReport(req: Request, sessionId: string): Promise<Response> {
  const entry = sessionStore.get(sessionId);
  if (!entry) {
    return Response.json({ error: "Report not found or expired." }, { status: 404 });
  }

  if (entry.expiresAt < Date.now()) {
    sessionStore.delete(sessionId);
    return Response.json({ error: "Report expired." }, { status: 410 });
  }

  const status = getCookieStatus(req);
  if (!status.hasPaid) {
    return Response.json(
      { error: "Payment required to unlock the full report." },
      { status: 402 },
    );
  }

  // Return full report and clean up the session
  const report = entry.report;
  sessionStore.delete(sessionId);
  return Response.json({ report });
}

// ── Main server ──────────────────────────────────────────────────────────────

for (let attempt = 1; ; attempt++) {
  await Bun.$`sudo sh -c ${freePort}`.quiet().nothrow();
  try {
    Bun.serve({
      port: PORT,
      hostname: HOST,
      maxRequestBodySize: 64 * 1024, // 64 KB

      async fetch(req) {
        const { pathname } = new URL(req.url);

        // ── API routes ──────────────────────────────────────────
        if (pathname === "/api/analyze" && req.method === "POST") {
          return addSecurityHeaders(await handleAnalyze(req));
        }
        if (pathname === "/api/paid" && req.method === "POST") {
          return addSecurityHeaders(await handlePaid(req));
        }
        if (pathname === "/api/stats" && req.method === "GET") {
          return addSecurityHeaders(await handleStats(req));
        }
        // GET /api/report/:sessionId — retrieve full report after payment
        const reportMatch = pathname.match(/^\/api\/report\/([a-zA-Z0-9-]+)$/);
        if (reportMatch && req.method === "GET") {
          return addSecurityHeaders(await handleGetReport(req, reportMatch[1]!));
        }

        // ── Static files ────────────────────────────────────────
        let response: Response;
        if (pathname !== "/") {
          const file = Bun.file(CLIENT_DIR + pathname);
          if (await file.exists()) {
            response = new Response(file);
            return addSecurityHeaders(response);
          }
        }
        response = await (
          handler as { fetch: (r: Request) => Response | Promise<Response> }
        ).fetch(req);
        return addSecurityHeaders(response);
      },
    });
    break;
  } catch (err) {
    if (attempt >= 10) throw err;
    await Bun.sleep(200);
  }
}

console.log(`team-site serving on http://${HOST}:${String(PORT)}`);
