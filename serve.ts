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
  let body: { idea?: string };
  try {
    body = await req.json() as { idea?: string };
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

  if (status.hasPaid) {
    try {
      const report = await runReport(body.idea.trim());
      return Response.json({ report });
    } catch (err) {
      console.error("Report generation failed:", err);
      return Response.json({ error: "Failed to generate report." }, { status: 500 });
    }
  }

  if (!status.hasFree) {
    try {
      const report = await runReport(body.idea.trim());
      const cookieVal = signValue("1");
      return Response.json({ report, setFreeCookie: cookieVal });
    } catch (err) {
      console.error("Report generation failed:", err);
      return Response.json({ error: "Failed to generate report." }, { status: 500 });
    }
  }

  return Response.json({
    paywall: true,
    message: "You've used your free analysis. Get unlimited reports for €9.99 one-time.",
    paymentLink: process.env.STRIPE_PAYMENT_LINK || "#",
  });
}

async function handlePaid(): Promise<Response> {
  return Response.json({ paidCookie: signValue("1") });
}

// ── Main server ──────────────────────────────────────────────────────────────

for (let attempt = 1; ; attempt++) {
  await Bun.$`sudo sh -c ${freePort}`.quiet().nothrow();
  try {
    Bun.serve({
      port: PORT,
      hostname: HOST,
      async fetch(req) {
        const { pathname } = new URL(req.url);

        // ── API routes ──────────────────────────────────────────
        if (pathname === "/api/analyze" && req.method === "POST") {
          return handleAnalyze(req);
        }
        if (pathname === "/api/paid" && req.method === "POST") {
          return handlePaid();
        }

        // ── Static files ────────────────────────────────────────
        if (pathname !== "/") {
          const file = Bun.file(CLIENT_DIR + pathname);
          if (await file.exists()) return new Response(file);
        }
        return (
          handler as { fetch: (r: Request) => Response | Promise<Response> }
        ).fetch(req);
      },
    });
    break;
  } catch (err) {
    if (attempt >= 10) throw err;
    await Bun.sleep(200);
  }
}

console.log(`team-site serving on http://${HOST}:${String(PORT)}`);
