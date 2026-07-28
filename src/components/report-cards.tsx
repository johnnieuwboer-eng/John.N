// ── Types ────────────────────────────────────────────────────────────────────

export interface AngleReport {
  name: string;
  score: number;
  verdict: "red_flag" | "yellow_flag" | "green_light";
  analysis: string;
  experiment: string;
}

export interface Report {
  overallScore: number;
  summary: string;
  angles: AngleReport[];
}

// ── Components ───────────────────────────────────────────────────────────────

export function ScoreCircle({ score }: { score: number }) {
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

export function VerdictBadge({ verdict }: { verdict: string }) {
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

export function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const hue = ((score - 1) / 9) * 120;
  return (
    <div className="h-2 w-full rounded-full bg-gray-800">
      <div className="h-2 rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: `hsl(${hue}, 80%, 50%)` }} />
    </div>
  );
}

export function AngleCard({ angle, index }: { angle: AngleReport; index: number }) {
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
