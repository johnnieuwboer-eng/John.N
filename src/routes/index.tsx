import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";

export const Route = createFileRoute("/")({
  component: Home,
});

// ── Types ────────────────────────────────────────────────────────────────────

interface AngleReport {
  name: string;
  score: number;
  verdict: "red_flag" | "yellow_flag" | "green_light";
  analysis: string;
  experiment: string;
}

interface Report {
  overallScore: number;
  summary: string;
  angles: AngleReport[];
}

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

function ScoreCircle({ score }: { score: number }) {
  const hue = ((score - 1) / 9) * 120;
  const color = `hsl(${hue}, 80%, 50%)`;
  const bgColor = `hsla(${hue}, 80%, 50%, 0.15)`;
  return (
    <div
      className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold"
      style={{ backgroundColor: bgColor, color, border: `3px solid ${color}` }}
    >
      {score}
      <span className="text-xs font-normal opacity-70">/10</span>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const styles: Record<string, { bg: string; text: string; icon: string; label: string }> = {
    red_flag: { bg: "bg-red-950/50 border-red-800", text: "text-red-400", icon: "🔴", label: "Red Flag" },
    yellow_flag: { bg: "bg-yellow-950/50 border-yellow-800", text: "text-yellow-400", icon: "🟡", label: "Caution" },
    green_light: { bg: "bg-green-950/50 border-green-800", text: "text-green-400", icon: "🟢", label: "Green Light" },
  };
  const s = styles[verdict] || styles.yellow_flag;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.icon} {s.label}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const hue = ((score - 1) / 9) * 120;
  return (
    <div className="h-2 w-full rounded-full bg-gray-800">
      <div className="h-2 rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: `hsl(${hue}, 80%, 50%)` }} />
    </div>
  );
}

function AngleCard({ angle, index }: { angle: AngleReport; index: number }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 transition-all hover:border-gray-700" style={{ animationDelay: `${index * 100}ms` }}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h4 className="text-lg font-semibold text-gray-100">{angle.name}</h4>
        <VerdictBadge verdict={angle.verdict} />
      </div>
      <div className="mb-3 flex items-center gap-3">
        <ScoreBar score={angle.score} />
        <span className="min-w-[2ch] text-sm font-bold text-gray-400">{angle.score}/10</span>
      </div>
      <p className="mb-3 text-sm leading-relaxed text-gray-300">{angle.analysis}</p>
      <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">🧪 Experiment to run</p>
        <p className="mt-1 text-sm text-amber-200/80">{angle.experiment}</p>
      </div>
    </div>
  );
}

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
          <a href="/" className="text-xl font-bold tracking-tight text-gray-100">{businessName}</a>
          {userPaid && (
            <span className="rounded-full border border-amber-800/50 bg-amber-950/50 px-3 py-1 text-xs font-medium text-amber-400">PRO</span>
          )}
        </div>
      </header>

      {(state === "form" || state === "error") && (
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
          <div className="w-full max-w-2xl text-center">
            <span className="mb-4 inline-block rounded-full border border-amber-800/50 bg-amber-950/30 px-3 py-1 text-xs font-medium text-amber-400">
              AI-Powered Startup Validation
            </span>
            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Stress-test your startup idea<br />
              <span className="text-amber-500">before you build it</span>
            </h1>
            <p className="mb-10 text-lg leading-relaxed text-gray-400">
              Describe your idea and SteelProof will play devil's advocate — analyzing market demand, technical feasibility, competition, and
              financial viability. Get a scored report with specific experiments to derisk your concept before you spend months building.
            </p>
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
                Analyze My Idea<span className="ml-2 text-sm font-normal opacity-60">— free</span>
              </button>
              <p className="text-xs text-gray-600">First analysis is free. No account required.</p>
            </div>
          </div>
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
