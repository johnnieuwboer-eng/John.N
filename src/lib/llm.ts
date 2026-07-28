// ── Types ────────────────────────────────────────────────────────────────────

export interface AngleReport {
  name: string;
  score: number; // 1-10
  verdict: "red_flag" | "yellow_flag" | "green_light";
  analysis: string;
  experiment: string;
}

export interface Report {
  overallScore: number; // 1-10
  summary: string;
  angles: AngleReport[];
}

// ── LLM API call ─────────────────────────────────────────────────────────────

export async function callLLM(
  idea: string,
  apiKey: string,
  baseUrl: string,
  model: string,
): Promise<Report> {
  const systemPrompt = `You are a startup idea stress-testing expert. Analyze the given startup idea across four angles:
1. Market Demand — Is there real demand? Who is the target audience?
2. Technical Feasibility — Can this be built with current technology? What are the technical challenges?
3. Competitive Landscape — Who are the competitors? What's the differentiation?
4. Financial Viability — Can this make money? What's the business model?

For each angle, provide:
- A score from 1-10
- A verdict: "red_flag" (critical risk), "yellow_flag" (caution), or "green_light" (strong)
- A 2-3 sentence analysis
- One specific, actionable experiment to derisk this angle

Also provide an overall score (1-10) and a 1-2 sentence summary.

Respond ONLY with valid JSON — no markdown, no code fences. The JSON shape must be:
{
  "overallScore": number,
  "summary": "string",
  "angles": [
    { "name": "Market Demand", "score": number, "verdict": "red_flag"|"yellow_flag"|"green_light", "analysis": "string", "experiment": "string" },
    { "name": "Technical Feasibility", "score": number, "verdict": "red_flag"|"yellow_flag"|"green_light", "analysis": "string", "experiment": "string" },
    { "name": "Competitive Landscape", "score": number, "verdict": "red_flag"|"yellow_flag"|"green_light", "analysis": "string", "experiment": "string" },
    { "name": "Financial Viability", "score": number, "verdict": "red_flag"|"yellow_flag"|"green_light", "analysis": "string", "experiment": "string" }
  ]
}`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyze this startup idea: ${idea}` },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`LLM API error (${response.status}): ${errText.slice(0, 200)}`);
  }

  const result = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  const rawContent = result.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error("Empty response from LLM API");
  }

  // Parse the JSON — strip any accidental markdown fences
  const jsonStr = rawContent
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(jsonStr) as Report;

  // Validate structure
  if (
    typeof parsed.overallScore !== "number" ||
    !Array.isArray(parsed.angles) ||
    parsed.angles.length !== 4
  ) {
    throw new Error("LLM returned invalid report structure");
  }

  return parsed;
}

// ── Keyword-based mock (fallback when no API key) ────────────────────────────

export function mockReport(idea: string): Report {
  const lower = idea.toLowerCase();
  const keywords: Record<string, number> = {
    ai: 2, artificial: 2, intelligence: 2, ml: 2, machine: 2, learning: 2,
    marketplace: 1, platform: 1, saas: 1, subscription: 1,
    social: -1, network: -1, blockchain: -2, crypto: -2, nft: -3,
    uber: -1, "for x": -1,
    b2b: 1, enterprise: 1, healthcare: 1, fintech: 1,
    mobile: 0, app: 0, web: 0,
  };

  let signal = 0;
  for (const [kw, weight] of Object.entries(keywords)) {
    if (lower.includes(kw)) signal += weight;
  }

  // Base scores adjusted by keyword signal
  const clamp = (v: number) => Math.max(1, Math.min(10, v));

  const marketScore = clamp(5 + signal + Math.floor(Math.random() * 3) - 1);
  const techScore = clamp(6 + Math.floor(Math.random() * 3) - 1);
  const compScore = clamp(4 + signal + Math.floor(Math.random() * 3) - 1);
  const finScore = clamp(5 + Math.floor(Math.random() * 3) - 1);

  const overallScore = clamp(
    Math.round((marketScore + techScore + compScore + finScore) / 4),
  );

  const verdict = (s: number): "red_flag" | "yellow_flag" | "green_light" => {
    if (s <= 3) return "red_flag";
    if (s <= 6) return "yellow_flag";
    return "green_light";
  };

  return {
    overallScore,
    summary: overallScore >= 7
      ? "This idea shows strong potential across multiple dimensions and is worth pursuing with focused validation."
      : overallScore >= 4
        ? "This idea has some promise but contains significant risks that need targeted derisking experiments."
        : "This idea faces substantial challenges. Consider pivoting or substantially rethinking the approach before investing significant resources.",
    angles: [
      {
        name: "Market Demand",
        score: marketScore,
        verdict: verdict(marketScore),
        analysis:
          marketScore >= 7
            ? "There appears to be clear market demand for this type of solution. The target audience is well-defined and the pain point resonates with potential users."
            : marketScore >= 4
              ? "The market need exists but may be narrower than ideal. Customer discovery interviews will help validate whether the pain point is acute enough to drive adoption."
              : "Market demand for this concept is uncertain. The problem may not be painful enough for customers to switch from existing alternatives or pay for a solution.",
        experiment:
          "Run 10-15 customer discovery interviews with your target audience. Ask about their current workflow and listen for the pain point without mentioning your solution. Count how many mention it unprompted.",
      },
      {
        name: "Technical Feasibility",
        score: techScore,
        verdict: verdict(techScore),
        analysis:
          techScore >= 7
            ? "The technical requirements are well within reach using current technology. An MVP could be built relatively quickly with off-the-shelf components."
            : techScore >= 4
              ? "There are some technical challenges that will require careful planning. Consider whether a simpler V1 could validate the core hypothesis before tackling the hard parts."
              : "Significant technical hurdles exist. A research spike or proof of concept is essential before committing to a full build.",
        experiment:
          "Build the simplest working prototype in 48 hours — a 'Wizard of Oz' version where you manually do what the software would automate. Test it with 3 real users to see if the core mechanic delivers value.",
      },
      {
        name: "Competitive Landscape",
        score: compScore,
        verdict: verdict(compScore),
        analysis:
          compScore >= 7
            ? "The competitive landscape is favorable — either few direct competitors exist, or there's a clear differentiation angle that sets this idea apart."
            : compScore >= 4
              ? "There are established competitors in the space, but gaps exist that this idea could fill. A focused positioning strategy will be critical."
              : "The market is crowded with well-funded competitors. Without a very strong and defensible differentiator, gaining traction will be extremely difficult.",
        experiment:
          "Create a competitive matrix: list the top 5 competitors, their key features, pricing, and target audience. Identify 2-3 underserved segments or unmet needs. Validate with 5 potential customers from those segments.",
      },
      {
        name: "Financial Viability",
        score: finScore,
        verdict: verdict(finScore),
        analysis:
          finScore >= 7
            ? "The unit economics look promising with clear paths to revenue. Customer acquisition costs should be manageable relative to lifetime value."
            : finScore >= 4
              ? "The business model could work but margins may be tight. More research into customer willingness-to-pay and acquisition channels is needed."
              : "The path to profitability is unclear. The cost to acquire customers may exceed what they're willing to pay, or the market may be too small to sustain a viable business.",
        experiment:
          "Create a simple landing page with pricing tiers and a 'Buy Now' button that leads to a 'coming soon' form. Measure click-through rates on the pricing button vs. other CTAs to gauge willingness-to-pay.",
      },
    ],
  };
}
