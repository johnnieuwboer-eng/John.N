import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { ScoreCircle, VerdictBadge, ScoreBar, AngleCard } from "~/components/report-cards";
import type { AngleReport, Report } from "~/components/report-cards";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [
      { rel: "canonical", href: "https://steelproof.ctonew.app" },
    ],
  }),
  component: Home,
});

// ── Types ────────────────────────────────────────────────────────────────────

interface ApiResponse {
  report?: Report;
  paywall?: boolean;
  message?: string;
  paymentLink?: string;
  error?: string;
  setFreeCookie?: string;
  paidCookie?: string;
}

type AppState = "form" | "loading" | "report" | "paywall" | "error";

// ── Cookie helpers ───────────────────────────────────────────────────────────

const COOKIE_NAMES = { free: "sp_free", paid: "sp_paid" } as const;

function setClientCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax; Secure`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-6 py-20">
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-3 w-3 animate-bounce rounded-full bg-amber-500" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
      <p className="text-lg text-gray-400">Analyzing your idea...</p>
      <div className="w-full max-w-md space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-800" style={{ animationDelay: `${i * 200}ms` }} />
        ))}
      </div>
    </div>
  );
}

function PaywallOverlay({ message, paymentLink, onClose }: { message: string; paymentLink: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center shadow-2xl">
        <div className="mb-4 text-5xl">🔒</div>
        <h3 className="mb-2 text-2xl font-bold text-gray-100">Free Report Used</h3>
        <p className="mb-6 text-gray-400">{message}</p>
        <a href={paymentLink} className="mb-3 block w-full rounded-xl bg-amber-500 px-6 py-3 text-center font-semibold text-gray-950 transition-colors hover:bg-amber-400">
          Get Unlimited Reports — €9.99
        </a>
        <button onClick={onClose} className="text-sm text-gray-500 underline transition-colors hover:text-gray-400">
          Maybe later
        </button>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

function Home() {
  const businessName = "SteelProof";

  const [idea, setIdea] = useState("");
  const [state, setState] = useState<AppState>("form");
  const [report, setReport] = useState<Report | null>(null);
  const [paywallMsg, setPaywallMsg] = useState("");
  const [paywallLink, setPaywallLink] = useState("#");
  const [errorMsg, setErrorMsg] = useState("");
  const [userPaid, setUserPaid] = useState(false);

  // Detect Stripe return with ?paid=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "true") {
      fetch("/api/paid", { method: "POST" })
        .then((r) => r.json())
        .then((data: ApiResponse) => {
          if (data.paidCookie) {
            setClientCookie(COOKIE_NAMES.paid, data.paidCookie);
            setUserPaid(true);
          }
          window.history.replaceState({}, "", "/");
        })
        .catch(() => {});
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (idea.trim().length < 20) {
      setErrorMsg("Please describe your idea in at least 20 characters.");
      setState("error");
      return;
    }

    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: idea.trim() }),
      });
      const data: ApiResponse = await res.json();

      if (data.paywall) {
        setPaywallMsg(data.message || "Free report used.");
        setPaywallLink(data.paymentLink || "#");
        setState("paywall");
        return;
      }

      if (data.error) {
        setErrorMsg(data.error);
        setState("error");
        return;
      }

      if (data.report) {
        if (data.setFreeCookie) {
          setClientCookie(COOKIE_NAMES.free, data.setFreeCookie);
        }
        setReport(data.report);
        setState("report");
        setTimeout(() => {
          document.getElementById("report-section")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
        return;
      }

      setErrorMsg("Unexpected response. Please try again.");
      setState("error");
    } catch {
      setErrorMsg("Something went wrong. Please check your connection and try again.");
      setState("error");
    }
  }, [idea]);

  const handleReset = useCallback(() => {
    setState("form");
    setReport(null);
    setErrorMsg("");
  }, []);

  const handleCopyReport = useCallback(() => {
    if (!report) return;
    const lines = [
      `SteelProof Report — Overall Score: ${report.overallScore}/10`,
      "",
      report.summary,
      "",
      ...report.angles.flatMap((a) => [
        `--- ${a.name}: ${a.score}/10 — ${a.verdict.replace("_", " ").toUpperCase()} ---`,
        a.analysis,
        `Experiment: ${a.experiment}`,
        "",
      ]),
    ];
    navigator.clipboard.writeText(lines.join("\n")).catch(() => {});
    const btn = document.getElementById("copy-btn");
    if (btn) {
      btn.textContent = "Copied!";
      setTimeout(() => { btn.textContent = "Copy Report"; }, 2000);
    }
  }, [report]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-gray-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <a href="/" className="text-xl font-bold tracking-tight text-gray-100">{businessName}</a>
            <a href="/examples" className="text-sm font-medium text-gray-400 transition-colors hover:text-gray-200">Examples</a>
          </div>
          {userPaid && (
            <span className="rounded-full border border-amber-800/50 bg-amber-950/50 px-3 py-1 text-xs font-medium text-amber-400">PRO</span>
          )}
        </div>
      </header>

      {(state === "form" || state === "error") && (
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
          <div className="w-full max-w-2xl text-center">
            <span className="mb-4 inline-block rounded-full border border-amber-800/50 bg-amber-950/30 px-3 py-1 text-xs font-medium text-amber-400">
              Your AI co-founder
            </span>
            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Stop building startups<br />
              <span className="text-amber-500">nobody wants</span>
            </h1>
            <p className="mb-6 text-xl leading-relaxed text-gray-300">
              Get an AI-powered investor-style review of your idea in under 5 minutes.
            </p>
            <div className="mb-10 grid grid-cols-2 gap-3 text-left max-w-lg mx-auto">
              {[
                "Find hidden risks",
                "Discover competitors you missed",
                "Challenge your assumptions",
                "Get actionable next steps",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-gray-300">
                  <span className="mt-0.5 text-amber-500 flex-shrink-0">✓</span>
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <textarea
                value={idea}
                onChange={(e) => { setIdea(e.target.value); if (errorMsg) setErrorMsg(""); if (state === "error") setState("form"); }}
                placeholder="Describe your startup idea in 3-4 sentences. What problem does it solve? Who is it for? How does it work? Example: 'A marketplace connecting freelance developers with startups for short-term, project-based work. Developers set their rates and availability, startups post projects with budgets. We handle payments and contracts.'"
                rows={5}
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-5 py-4 text-gray-100 placeholder-gray-500 transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
              />
              {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}
              <button
                onClick={handleSubmit}
                disabled={idea.trim().length < 20}
                className="w-full rounded-xl bg-amber-500 px-8 py-4 text-lg font-semibold text-gray-950 transition-all hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Analyze My Idea — Free
              </button>
              <p className="text-xs text-gray-600">First analysis is free. No account required.</p>
              <p className="text-xs text-gray-600 mt-2">Join founders who've validated their ideas</p>
            </div>
          </div>

          {/* How it works */}
          <section className="mt-20 w-full max-w-3xl">
            <h2 className="mb-8 text-center text-2xl font-bold text-gray-100 sm:text-3xl">
              How it works
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Describe your idea",
                  desc: "Write a few sentences about your startup concept. What problem does it solve, who is it for, and how does it work? The more detail you share, the sharper your report.",
                },
                {
                  step: "2",
                  title: "AI stress-tests it",
                  desc: "Our AI plays devil's advocate, interrogating your idea from four critical angles — market demand, technical feasibility, competitive landscape, and financial viability.",
                },
                {
                  step: "3",
                  title: "Get your report",
                  desc: "Within seconds you'll receive a scored report with red flags, green lights, and specific experiments to derisk your concept before you spend months building the wrong thing.",
                },
              ].map((item) => (
                <div key={item.step} className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 text-left">
                  <span className="mb-3 inline-block rounded-lg bg-amber-950/50 px-3 py-1 text-xs font-bold text-amber-400">
                    Step {item.step}
                  </span>
                  <h3 className="mb-2 text-lg font-semibold text-gray-100">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* What you'll learn */}
          <section className="mt-20 w-full max-w-3xl">
            <h2 className="mb-8 text-center text-2xl font-bold text-gray-100 sm:text-3xl">
              What you'll learn
            </h2>
            <p className="mb-8 text-center text-gray-400">
              Every SteelProof report evaluates your idea across four dimensions that investors and accelerators care about most.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Market Demand",
                  icon: "📊",
                  desc: "Is there real demand for what you're building, or is it wishful thinking? We pressure-test your assumptions about customer pain, market size, and willingness to pay — so you know whether you're solving a vitamin problem or a painkiller problem.",
                },
                {
                  title: "Technical Feasibility",
                  icon: "⚙️",
                  desc: "Can it actually be built with today's technology, or are there hidden complexity bombs waiting to go off? We flag technical risks early — integration headaches, scale challenges, and platform dependencies — so your roadmap is grounded in reality.",
                },
                {
                  title: "Competitive Landscape",
                  icon: "🏔️",
                  desc: "Who's already in the space, and how do you win against them? We map direct competitors, indirect substitutes, and the 'do nothing' alternative — then help you find the wedge that makes your idea defensible.",
                },
                {
                  title: "Financial Viability",
                  icon: "💰",
                  desc: "Can this actually make money? We examine unit economics, revenue model assumptions, and path to breakeven. If the numbers don't add up, you'll know before you invest your savings — not after.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 text-left">
                  <span className="mb-2 block text-2xl">{item.icon}</span>
                  <h3 className="mb-2 text-lg font-semibold text-gray-100">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-gray-500">
              Each angle comes with a specific, low-cost experiment you can run this week — no "build an MVP and see what happens" advice. Concrete next steps only.
            </p>
          </section>
        </main>
      )}

      {state === "loading" && (
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
          <LoadingState />
        </main>
      )}

      {state === "report" && report && (
        <main id="report-section" className="flex-1 px-6 py-10">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <div className="mb-4 flex justify-center"><ScoreCircle score={report.overallScore} /></div>
              <h2 className="mb-3 text-2xl font-bold text-gray-100 sm:text-3xl">Stress-Test Report</h2>
              <p className="mx-auto max-w-xl text-gray-400">{report.summary}</p>
            </div>
            <div className="mb-10 space-y-4">
              {report.angles.map((angle, i) => (<AngleCard key={angle.name} angle={angle} index={i} />))}
            </div>
            <div className="flex flex-col items-center gap-4 border-t border-gray-800 pt-8 sm:flex-row sm:justify-center">
              <button onClick={handleReset} className="rounded-xl border border-gray-700 bg-gray-900 px-6 py-3 font-medium text-gray-200 transition-colors hover:border-gray-600 hover:bg-gray-800">
                Stress-test another idea
              </button>
              <button id="copy-btn" onClick={handleCopyReport} className="rounded-xl bg-gray-800 px-6 py-3 font-medium text-gray-200 transition-colors hover:bg-gray-700">
                Copy Report
              </button>
            </div>
          </div>
        </main>
      )}

      {state === "paywall" && <PaywallOverlay message={paywallMsg} paymentLink={paywallLink} onClose={handleReset} />}

      <footer className="border-t border-gray-800 px-6 py-6 text-center text-sm text-gray-600">
        Powered by AI — reports are for guidance only. Always validate with real customers.
      </footer>
    </div>
  );
}
