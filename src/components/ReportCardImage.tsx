import { useState, useCallback } from "react";
import type { Report } from "./report-cards";

// ── Types ────────────────────────────────────────────────────────────────────

/** Partial report (scores/verdicts only). */
interface PartialReport {
  overallScore: number;
  summary: string;
  angles: { name: string; score: number; verdict: string }[];
}

/** Union type for both full and partial reports. */
type ReportData = Report | PartialReport;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Escape XML special characters so the SVG string is valid. */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Map a verdict string to its display label. */
function verdictLabel(verdict: string): string {
  switch (verdict) {
    case "red_flag":   return "Red Flag";
    case "yellow_flag": return "Caution";
    case "green_light": return "Green Light";
    default:            return "Caution";
  }
}

/** Map a verdict to colours for the badge. */
function verdictColors(verdict: string): { bg: string; text: string } {
  switch (verdict) {
    case "red_flag":   return { bg: "#7f1d1d", text: "#fca5a5" };
    case "yellow_flag": return { bg: "#713f12", text: "#fde047" };
    case "green_light": return { bg: "#14532d", text: "#86efac" };
    default:            return { bg: "#713f12", text: "#fde047" };
  }
}

/** Compute an HSL colour from 0-10 score (same hue logic as ScoreCircle). */
function scoreColor(score: number): string {
  const hue = ((score - 1) / 9) * 120; // 1→0°, 5→60°, 10→120°
  return `hsl(${hue}, 80%, 50%)`;
}

/** Wrap text into multiple <tspan> lines, respecting max chars per line. */
function wrapTSpans(text: string, maxChars: number, maxLines: number, x: string): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length <= maxChars) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);

  // If the last line is still too long, truncate with ellipsis.
  if (lines.length > 0 && lines[lines.length - 1].length > maxChars) {
    lines[lines.length - 1] = lines[lines.length - 1].slice(0, maxChars - 3) + "...";
  }

  return lines
    .map((line, i) =>
      i === 0
        ? `<tspan x="${x}" dy="0">${escapeXml(line)}</tspan>`
        : `<tspan x="${x}" dy="1.5em">${escapeXml(line)}</tspan>`
    )
    .join("\n");
}

// ── SVG Builder ──────────────────────────────────────────────────────────────

function buildSVG(report: ReportData, idea: string): string {
  const W = 1200;
  const H = 630;
  const color = scoreColor(report.overallScore);
  const displayIdea = idea.length > 100 ? idea.slice(0, 97) + "..." : idea;

  // Build angle-card rows
  const angleCards = report.angles
    .map((a, i) => {
      const x = 40 + i * 287; // 4 cards × 273px + 14px gaps
      return buildAngleCardSVG(a, x, 370, 273, 170);
    })
    .join("\n");

  // Wrap summary (2-3 lines, ~65 chars each)
  const summarySpans = wrapTSpans(report.summary, 62, 3, "300");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <clipPath id="roundedBg">
      <rect x="0" y="0" width="${W}" height="${H}" rx="16"/>
    </clipPath>
    <linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#1a2332"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="#0f172a" rx="16"/>

  <!-- Subtle top accent line -->
  <rect x="0" y="0" width="${W}" height="4" fill="${color}" rx="2"/>

  <!-- ── Logo row ── -->
  <g transform="translate(40, 40)">
    <!-- Shield icon -->
    <g transform="translate(0, 0) scale(1.15)">
      <path d="M 16 1 L 25 4 L 25 13 Q 25 19 16 26 Q 7 19 7 13 L 7 4 Z" fill="#f59e0b"/>
      <path d="M 11.5 14 L 14.5 17 L 20.5 11" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <!-- Brand name -->
    <text x="42" y="22" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="20" fill="#f59e0b" letter-spacing="-0.3">SteelProof</text>
  </g>

  <!-- Right-side label -->
  <text x="${W - 40}" y="58" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="14" fill="#475569" letter-spacing="1.5">STRESS-TEST REPORT</text>

  <!-- ── Idea subtitle ── -->
  <text x="${W / 2}" y="115" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="#64748b" font-style="italic">"${escapeXml(displayIdea)}"</text>

  <!-- ── Score circle (left third) ── -->
  <circle cx="170" cy="260" r="72" fill="none" stroke="${color}" stroke-width="4" opacity="0.85"/>
  <circle cx="170" cy="260" r="72" fill="${color}" opacity="0.08"/>
  <text x="170" y="248" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="52" fill="${color}">${report.overallScore}</text>
  <text x="170" y="282" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="18" fill="${color}" opacity="0.7">/ 10</text>

  <!-- ── Summary text (right of score) ── -->
  <text font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="#cbd5e1" line-height="1.5">
    ${summarySpans}
  </text>

  <!-- ── Angle cards ── -->
  ${angleCards}

  <!-- ── Footer ── -->
  <line x1="40" y1="${H - 40}" x2="${W - 40}" y2="${H - 40}" stroke="#1e293b" stroke-width="1"/>
  <text x="${W / 2}" y="${H - 16}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#475569">
    Get your own stress-test at steelproof.ctonew.app
  </text>
</svg>`;
}

/** Build SVG for a single angle card. */
function buildAngleCardSVG(
  angle: { name: string; score: number; verdict: string },
  x: number,
  y: number,
  w: number,
  h: number,
): string {
  const vc = verdictColors(angle.verdict);
  const sc = scoreColor(angle.score);
  const barWidth = w - 30; // padding left+right = 30
  const fillWidth = (angle.score / 10) * barWidth;

  return `
  <g transform="translate(${x}, ${y})">
    <!-- Card background -->
    <rect width="${w}" height="${h}" rx="10" fill="url(#cardGrad)" stroke="#334155" stroke-width="1"/>

    <!-- Angle name -->
    <text x="15" y="30" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="15" fill="#f1f5f9">${escapeXml(angle.name)}</text>

    <!-- Score bar background -->
    <rect x="15" y="55" width="${barWidth}" height="10" rx="5" fill="#1e293b" stroke="#334155" stroke-width="0.5"/>
    <!-- Score bar fill -->
    <rect x="15" y="55" width="${fillWidth}" height="10" rx="5" fill="${sc}"/>

    <!-- Score number -->
    <text x="${15 + barWidth + 8}" y="64" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14" fill="${sc}">${angle.score}/10</text>

    <!-- Verdict badge -->
    <rect x="15" y="90" width="85" height="26" rx="13" fill="${vc.bg}" opacity="0.9"/>
    <text x="57" y="107" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="11" fill="${vc.text}">${verdictLabel(angle.verdict)}</text>
  </g>`;
}

// ── PNG Generation ───────────────────────────────────────────────────────────

/**
 * Render an SVG string to a PNG blob via Canvas.
 * Uses the SVG → Blob → Image → Canvas pipeline, which is
 * compatible with all modern browsers.
 */
async function svgToPngBlob(svgString: string): Promise<Blob> {
  // Encode SVG as a blob URL
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const W = 1200;
    const H = 630;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not get 2D canvas context"));
        return;
      }

      // Draw the SVG image onto the canvas
      ctx.drawImage(img, 0, 0, W, H);
      URL.revokeObjectURL(url);

      // Convert to PNG blob
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Canvas toBlob returned null"));
          return;
        }
        resolve(blob);
      }, "image/png");
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG image"));
    };

    img.src = url;
  });
}

/** Trigger a browser download for a Blob. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a short delay to ensure the download starts
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ── React Hook ───────────────────────────────────────────────────────────────

export function useReportImage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImage = useCallback(async (report: ReportData, idea: string) => {
    setIsGenerating(true);
    setError(null);

    try {
      const svg = buildSVG(report, idea);
      const blob = await svgToPngBlob(svg);
      downloadBlob(blob, "steelproof-report.png");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate image";
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generateImage, isGenerating, error };
}
