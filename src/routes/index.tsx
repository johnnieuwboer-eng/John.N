import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { ScoreCircle, VerdictBadge, ScoreBar, AngleCard } from "~/components/report-cards";
import type { AngleReport, Report } from "~/components/report-cards";
import { useReportImage } from "~/components/ReportCardImage";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [
      { rel: "canonical", href: "https://steelproof.ctonew.app" },
    ],
  }),
  component: Home,
});

// ── Types ────────────────────────────────────────────────────────────────────

/** A report with scores/verdicts only — no analysis or experiments. */
interface PartialReport {
  overallScore: number;
  summary: string;
  angles: { name: string; score: number; verdict: string }[];
}

interface ApiResponse {
  report?: Report;
  partial?: boolean;
  partialReport?: PartialReport;
  sessionId?: string;
  paywall?: boolean;
  message?: string;
  paymentLink?: string;
  error?: string;
  setFreeCookie?: string;
  paidCookie?: string;
}

type AppState = "form" | "loading" | "report" | "partial" | "paywall" | "error";

// ── Cookie helpers ───────────────────────────────────────────────────────────

const COOKIE_NAMES = { free: "sp_free", paid: "sp_paid" } as const;
const SESSION_STORAGE_KEY = "sp_pending_session";

function setClientCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax; Secure`;
}

function hasPaidCookie(): boolean {
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${COOKIE_NAMES.paid}=`));
}

// ── Sub-components ───────────────────────────────────────────────────────────

function LoadingState() {
  const messages = [
    "Analyzing your idea...",
    "Checking market demand...",
    "Evaluating competitive landscape...",
    "Assessing financial viability...",
    "Compiling your report...",
  ];
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 py-20">
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-3 w-3 animate-bounce rounded-full bg-amber-500" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
      <p className="text-lg text-gray-400">{messages[msgIndex]}</p>
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
        <p className="mb-4 text-gray-400">{message}</p>
        <ul className="mb-6 text-left text-sm text-gray-300 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-amber-400 flex-shrink-0">✓</span>
            <span>Unlimited stress-test reports</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 flex-shrink-0">✓</span>
            <span>Compare multiple ideas side by side</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 flex-shrink-0">✓</span>
            <span>One payment, no subscription</span>
          </li>
        </ul>
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

/** Fix 1: Upsell card shown after a full free report. */
function UpsellCard({ paymentLink }: { paymentLink: string }) {
  return (
    <div className="rounded-xl border-2 border-amber-700/60 bg-amber-950/20 p-6 text-center">
      <p className="mb-3 text-lg font-semibold text-amber-200">
        Want to stress-test more ideas?
      </p>
      <p className="mb-4 text-sm leading-relaxed text-gray-300">
        Get unlimited reports for €9.99 one-time. Compare multiple ideas, find
        your strongest concept, and validate your entire pipeline.
      </p>
      <a
        href={paymentLink}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-2 inline-block rounded-xl bg-amber-500 px-8 py-3 font-semibold text-gray-950 transition-colors hover:bg-amber-400"
      >
        Get Unlimited Reports — €9.99
      </a>
      <p className="text-xs text-gray-500">
        Complete payment in the new tab, then return here.
      </p>
    </div>
  );
}

/** Fix 2: Teaser card shown below a partial report, prompting upgrade. */
function TeaserCard({ paymentLink, onCheckPayment }: { paymentLink: string; onCheckPayment: () => void }) {
  return (
    <div className="rounded-xl border-2 border-amber-700/60 bg-amber-950/20 p-6 text-center">
      <div className="mb-3 text-3xl">🔓</div>
      <p className="mb-2 text-lg font-semibold text-amber-200">
        Unlock the full analysis and experiments
      </p>
      <p className="mb-1 text-3xl font-bold text-amber-400">€9.99</p>
      <p className="mb-4 text-sm text-gray-400">one-time payment</p>
      <ul className="mb-6 text-left text-sm text-gray-300 space-y-1.5 max-w-xs mx-auto">
        <li className="flex items-start gap-2">
          <span className="text-amber-400 flex-shrink-0">✓</span>
          <span>Full analysis for each angle</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-amber-400 flex-shrink-0">✓</span>
          <span>Specific derisking experiments</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-amber-400 flex-shrink-0">✓</span>
          <span>Unlimited future reports</span>
        </li>
      </ul>
      <a
        href={paymentLink}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-3 block w-full rounded-xl bg-amber-500 px-6 py-3 text-center font-semibold text-gray-950 transition-colors hover:bg-amber-400"
      >
        Get Unlimited Reports — €9.99
      </a>
      <p className="mb-2 text-xs text-gray-500">
        Complete payment in the new tab, then return here.
      </p>
      <button
        onClick={onCheckPayment}
        className="text-sm font-medium text-amber-400 underline transition-colors hover:text-amber-300"
      >
        I've completed payment — show my full report
      </button>
    </div>
  );
}

/** A card showing only the score bar and verdict badge — no analysis or experiment text. */
function PartialAngleCard({ angle, index }: { angle: { name: string; score: number; verdict: string }; index: number }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 transition-all hover:border-gray-700" style={{ animationDelay: `${index * 100}ms` }}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h4 className="text-lg font-semibold text-gray-100">{angle.name}</h4>
        <VerdictBadge verdict={angle.verdict} />
      </div>
      <div className="flex items-center gap-3">
        <ScoreBar score={angle.score} />
        <span className="min-w-[2ch] text-sm font-bold text-gray-400">{angle.score}/10</span>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

function Home() {
  const [idea, setIdea] = useState("");
  const [state, setState] = useState<AppState>("form");
  const [report, setReport] = useState<Report | null>(null);
  const [paywallMsg, setPaywallMsg] = useState("");
  const [paywallLink, setPaywallLink] = useState("#");
  const [errorMsg, setErrorMsg] = useState("");
  const [userPaid, setUserPaid] = useState(false);
  const [reportsGenerated, setReportsGenerated] = useState<number | null>(null);
  const [pageViews, setPageViews] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string>("#");
  const [partialReport, setPartialReport] = useState<PartialReport | null>(null);

  /** Attempt to fetch the full report for a pending session ID. */
  const fetchFullReport = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/report/${sid}`);
      if (!res.ok) return false;
      const data: ApiResponse = await res.json();
      if (data.report) {
        setReport(data.report);
        setState("report");
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        setSessionId(null);
        setPartialReport(null);
        setTimeout(() => {
          document.getElementById("report-section")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
        return true;
      }
    } catch {
      // Ignore fetch errors
    }
    return false;
  }, []);

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

            // If there's a pending session, fetch the full report
            const pendingSid = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (pendingSid) {
              fetchFullReport(pendingSid);
            }
          }
          window.history.replaceState({}, "", "/");
        })
        .catch(() => {});
    }
  }, [fetchFullReport]);

  // Detect when user returns from payment in another tab (visibility change)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && hasPaidCookie() && !userPaid) {
        setUserPaid(true);
        const pendingSid = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (pendingSid) {
          fetchFullReport(pendingSid);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [userPaid, fetchFullReport]);

  // Fetch live reports-generated counter
  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data: { reportsGenerated: number; pageViews: number }) => {
        setReportsGenerated(data.reportsGenerated ?? 0);
        setPageViews(data.pageViews ?? 0);
      })
      .catch(() => {});
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

      // Store payment link for upsell/teaser cards
      if (data.paymentLink) {
        setPaymentLink(data.paymentLink);
      }

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

      // ── Partial report (returning free user) ────────────────────────
      if (data.partial && data.partialReport && data.sessionId) {
        setPartialReport(data.partialReport);
        setSessionId(data.sessionId);
        // Persist session ID so we can recover after payment in another tab
        sessionStorage.setItem(SESSION_STORAGE_KEY, data.sessionId);
        setState("partial");
        setTimeout(() => {
          document.getElementById("partial-report-section")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
        return;
      }

      // ── Full report (paid user or first-time free) ──────────────────
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
    setPartialReport(null);
    setSessionId(null);
    setErrorMsg("");
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  const handleCheckPayment = useCallback(() => {
    if (hasPaidCookie()) {
      setUserPaid(true);
      const pendingSid = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (pendingSid) {
        fetchFullReport(pendingSid);
      }
    }
  }, [fetchFullReport]);

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

  const { generateImage, isGenerating, error: imageError } = useReportImage();

  const handleShareImage = useCallback(async () => {
    const data = report || partialReport;
    if (!data) return;
    await generateImage(data, idea);
  }, [report, partialReport, idea, generateImage]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-gray-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <a href="/" className="inline-flex items-center gap-2" aria-label="SteelProof home">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40" className="h-8 w-auto" aria-hidden="true">
                <g transform="translate(0, 4)">
                  <path d="M 16 1 L 25 4 L 25 13 Q 25 19 16 26 Q 7 19 7 13 L 7 4 Z" fill="#f59e0b"/>
                  <path d="M 11.5 14 L 14.5 17 L 20.5 11" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </g>
                <text x="36" y="29" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="20" fill="#f59e0b" letter-spacing="-0.5">SteelProof</text>
              </svg>
            </a>
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
              <p className="text-xs text-gray-500">
                Your idea is never stored, shared, or used to train AI models. We send it to the LLM, generate your report, and forget it.
              </p>
              <a href="/examples" className="inline-block text-sm text-amber-400 transition-colors hover:text-amber-300">
                See an example report first →
              </a>
              {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}
              <button
                onClick={handleSubmit}
                disabled={idea.trim().length < 20}
                className="w-full rounded-xl bg-amber-500 px-8 py-4 text-lg font-semibold text-gray-950 transition-all hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Analyze My Idea — Free
              </button>
              <p className="text-xs text-gray-500">One free report per founder — make it count.</p>
              {reportsGenerated !== null && reportsGenerated > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {reportsGenerated} startup ideas stress-tested · {pageViews !== null ? pageViews : 0} visitors
                </p>
              )}
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

      {/* ── Full report (paid user or first-time free) ──────────────────── */}
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

            {/* Fix 1: Post-report upsell card (only shown to free users, not paid) */}
            {!userPaid && paymentLink !== "#" && (
              <div className="mb-10">
                <UpsellCard paymentLink={paymentLink} />
              </div>
            )}

            <div className="flex flex-col items-center gap-4 border-t border-gray-800 pt-8 sm:flex-row sm:justify-center">
              <button onClick={handleReset} className="rounded-xl border border-gray-700 bg-gray-900 px-6 py-3 font-medium text-gray-200 transition-colors hover:border-gray-600 hover:bg-gray-800">
                Stress-test another idea
              </button>
              <button id="copy-btn" onClick={handleCopyReport} className="rounded-xl bg-gray-800 px-6 py-3 font-medium text-gray-200 transition-colors hover:bg-gray-700">
                Copy Report
              </button>
              <button
                onClick={handleShareImage}
                disabled={isGenerating}
                className="rounded-xl bg-amber-600 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : "Share as Image"}
              </button>
            </div>
            {imageError && <p className="mt-3 text-center text-sm text-red-400">{imageError}</p>}
          </div>
        </main>
      )}

      {/* ── Partial report (returning free user — Fix 2) ───────────────── */}
      {state === "partial" && partialReport && (
        <main id="partial-report-section" className="flex-1 px-6 py-10">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 text-center">
              <div className="mb-4 flex justify-center"><ScoreCircle score={partialReport.overallScore} /></div>
              <h2 className="mb-3 text-2xl font-bold text-gray-100 sm:text-3xl">Report Preview</h2>
              <p className="mx-auto max-w-xl text-gray-400">{partialReport.summary}</p>
            </div>

            <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900/30 p-4 text-center">
              <p className="text-sm text-gray-400">
                You've used your free report. Here's a preview — unlock the full analysis below.
              </p>
            </div>

            <div className="mb-10 space-y-4">
              {partialReport.angles.map((angle, i) => (
                <PartialAngleCard key={angle.name} angle={angle} index={i} />
              ))}
            </div>

            {/* Fix 2: Teaser card to unlock full report */}
            <div className="mb-10">
              <TeaserCard paymentLink={paymentLink} onCheckPayment={handleCheckPayment} />
            </div>

            <div className="flex flex-col items-center gap-4 border-t border-gray-800 pt-8">
              <button onClick={handleReset} className="rounded-xl border border-gray-700 bg-gray-900 px-6 py-3 font-medium text-gray-200 transition-colors hover:border-gray-600 hover:bg-gray-800">
                Try a different idea
              </button>
              <button
                onClick={handleShareImage}
                disabled={isGenerating}
                className="rounded-xl bg-amber-600 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : "Share as Image"}
              </button>
            </div>
            {imageError && <p className="mt-3 text-center text-sm text-red-400">{imageError}</p>}
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
