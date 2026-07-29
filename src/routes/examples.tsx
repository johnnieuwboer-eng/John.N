import { createFileRoute } from "@tanstack/react-router";
import { ScoreCircle, VerdictBadge, ScoreBar, AngleCard } from "~/components/report-cards";
import type { Report } from "~/components/report-cards";

export const Route = createFileRoute("/examples")({
  head: () => ({
    meta: [
      { title: "Startup Idea Stress-Test Examples | SteelProof" },
      {
        name: "description",
        content:
          "See how SteelProof's AI analyzes startup ideas. Example reports for marketplace, subscription, and platform business models.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Startup Idea Stress-Test Examples | SteelProof" },
      { property: "og:description", content: "See how SteelProof's AI analyzes startup ideas. Example reports for marketplace, subscription, and platform business models." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://steelproof.ctonew.app/examples" },
      { property: "og:site_name", content: "SteelProof" },
      { property: "og:image", content: "https://steelproof.ctonew.app/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Startup Idea Stress-Test Examples | SteelProof" },
      { name: "twitter:description", content: "See how SteelProof's AI analyzes startup ideas. Example reports for marketplace, subscription, and platform business models." },
      { name: "twitter:image", content: "https://steelproof.ctonew.app/og-image.png" },
    ],
    links: [
      { rel: "canonical", href: "https://steelproof.ctonew.app/examples" },
    ],
  }),
  component: ExamplesPage,
});

// ── Hardcoded Example Reports ─────────────────────────────────────────────────

const examples: { idea: string; report: Report }[] = [
  {
    idea: "Uber for dog walking",
    report: {
      overallScore: 6,
      summary:
        "A marketplace connecting dog owners with local walkers on-demand. Strong tailwinds from the pet economy, but faces entrenched incumbents with strong network effects and thin unit economics.",
      angles: [
        {
          name: "Market Demand",
          score: 8,
          verdict: "green_light",
          analysis:
            "The pet care market is massive — Americans spent over $140B on pets in 2025. 65% of households own a pet, and dog walking is a recurring, non-discretionary need for millions of urban professionals. The trend toward treating pets as family members drives willingness to pay for premium care services.",
          experiment: "Run a concierge MVP in one dense urban neighborhood. Post in 5 local Facebook / Nextdoor groups offering a 'dog walking concierge' — manually match owners to a vetted walker via text. Measure conversion rate from inquiry to first walk and repeat booking rate over 4 weeks.",
        },
        {
          name: "Technical Feasibility",
          score: 7,
          verdict: "green_light",
          analysis:
            "No novel technology required. GPS tracking, in-app payments (Stripe Connect), scheduling, and real-time photo updates are all solved problems with mature APIs. The main challenge is trust & safety infrastructure — background checks, insurance integration, and incident handling workflows.",
          experiment: "Build a no-code prototype using Glide or Bubble that lets a walker accept a booking, share GPS location, and send a photo upon completion. Test with 3 walkers and 10 owners to identify the friction points before writing production code.",
        },
        {
          name: "Competitive Landscape",
          score: 4,
          verdict: "red_flag",
          analysis:
            "Rover and Wag control ~80% of the on-demand dog walking market in the US. Both have strong brand recognition, millions of users, and network effects that make it hard for new entrants. However, both have faced criticism over quality control and pricing — a premium, highly-vetted alternative could carve out a niche at the high end.",
          experiment: "Interview 20 Rover/Wag users who churned. Ask: why did you leave? What would make you switch to a new service? Map responses to identify an underserved segment (e.g., owners of reactive dogs, seniors needing consistent walkers, off-hours availability).",
        },
        {
          name: "Financial Viability",
          score: 5,
          verdict: "yellow_flag",
          analysis:
            "Take rates in the 20-30% range are standard, but walker acquisition is expensive and churn is high. At $25/walk with a 25% take rate, you need ~270 walks/month to cover a single full-time employee's salary in a major city. Insurance and background check costs per walker further compress margins. Path to profitability requires scale or premium pricing.",
          experiment: "Calculate unit economics for 3 pricing tiers: budget ($15/walk), standard ($25/walk), premium ($40/walk with additional vetting). For each, model the number of walks needed to reach breakeven on CAC within 6 months, accounting for walker churn at 30% annually.",
        },
      ],
    },
  },
  {
    idea: "Airbnb for power tools",
    report: {
      overallScore: 5,
      summary:
        "A peer-to-peer rental platform for drills, saws, pressure washers, and other occasional-use tools. Taps into the 'access over ownership' trend, but faces steep challenges around liability, damage, and low repeat usage.",
      angles: [
        {
          name: "Market Demand",
          score: 6,
          verdict: "yellow_flag",
          analysis:
            "The tool rental market is sizable at ~$50B globally, but demand for individual tool rentals is sporadic. Most homeowners need a specific tool 1-2 times per year. The 'occasional DIYer' segment is real but converting them to a platform vs. borrowing from a neighbor or renting from Home Depot is a behavioral challenge. Density is key — the platform only works if there's a critical mass of lenders in close proximity.",
          experiment: "Map Craigslist/Facebook Marketplace tool rental listings in 3 cities. Count active listings, average rental price, and listing duration. This reveals existing latent supply and demand without your platform existing. Interview 10 people who've rented tools informally — what sucked about the experience?",
        },
        {
          name: "Technical Feasibility",
          score: 8,
          verdict: "green_light",
          analysis:
            "Straightforward marketplace tech: listings with photos, availability calendars, in-app messaging, payments, and a review system. All are well-understood patterns. The real technical challenge is trust: verifying tool condition pre- and post-rental, handling disputes over damage, and potentially integrating IoT trackers for high-value items.",
          experiment: "Build a lightweight directory (not a marketplace) listing tools available for rent with owner contact info. Use Carrd + Airtable. Drive traffic via local SEO for '[tool name] rental near me'. Track how many rental inquiries flow through before investing in payments infrastructure.",
        },
        {
          name: "Competitive Landscape",
          score: 5,
          verdict: "yellow_flag",
          analysis:
            "Home Depot, Lowe's, and local equipment rental shops dominate tool rentals. They offer insurance, well-maintained equipment, and physical pickup locations — hard advantages. Peer-to-peer alternatives like Fat Llama have tried and struggled. However, there's a gap for highly specialized tools (tile saws, floor sanders) that big-box stores don't always stock and that cost $500+ to buy for one project.",
          experiment: "For 20 specific tools (concrete mixer, floor sander, etc.), compare rental price and availability at Home Depot vs. local shops vs. what individuals charge on Craigslist. Identify 5 tools where peer-to-peer is clearly cheaper or more available, and focus the MVP on those.",
        },
        {
          name: "Financial Viability",
          score: 3,
          verdict: "red_flag",
          analysis:
            "Unit economics are brutal. A drill rents for $15-25/day with a 20% take rate = $3-5/platform transaction. At that revenue per transaction, you need enormous volume to cover acquisition costs. Liability insurance is expensive (~$2-5/rental). Tool damage and theft rates in peer-to-peer are high (10-15% in early P2P rental startups), creating customer service overhead that erodes margins further.",
          experiment: "Calculate the fully-loaded cost per transaction including: payment processing (2.9% + $0.30), insurance ($3-5), customer support overhead ($2-3), and marketing CAC. Determine the minimum take rate and transaction volume needed to reach contribution margin positive. If it exceeds 40% take rate, the model likely doesn't work.",
        },
      ],
    },
  },
  {
    idea: "Tinder for finding roommates",
    report: {
      overallScore: 7,
      summary:
        "A swipe-based app that matches potential roommates based on lifestyle compatibility, budget, and location preferences. The housing market's affordability crisis creates strong tailwinds, but user retention drops to zero after a successful match — a structural monetization challenge.",
      angles: [
        {
          name: "Market Demand",
          score: 8,
          verdict: "green_light",
          analysis:
            "Rising rents in major cities have made roommate arrangements necessary for millions of young professionals and students. Over 30% of adults aged 18-34 live with roommates. Existing solutions (Facebook groups, Craigslist, Roomster) are universally hated — slow, unsafe, full of spam. A modern, safe, low-friction alternative has strong product-market fit potential.",
          experiment: "Create a 'Roommate Compatibility Scorecard' as a downloadable PDF or simple web tool. Ask 10 lifestyle questions (sleep schedule, cleanliness, guest policy, noise tolerance). Generate a compatibility score. Gate the result behind an email. Measure downloads and email-to-waitlist conversion rate — this validates demand before building the app.",
        },
        {
          name: "Technical Feasibility",
          score: 7,
          verdict: "green_light",
          analysis:
            "The core tech is well-understood: profiles with photos and preferences, swipe-based matching (à la Tinder), in-app chat, and filtering by budget/location. Leverage existing map APIs for neighborhood search. The main challenge is safety: identity verification to prevent scams and bad actors, which adds complexity but is table-stakes for this category.",
          experiment: "Prototype the matching algorithm in a spreadsheet. Create 20 fake roommate profiles with varied preferences. Define a compatibility scoring function. Manually test whether matches 'feel right' — this validates the algorithm logic before writing any matching code.",
        },
        {
          name: "Competitive Landscape",
          score: 6,
          verdict: "yellow_flag",
          analysis:
            "Facebook housing groups dominate — they're free, have massive reach, and benefit from real identity (reducing scam risk). Roomster exists but has a terrible reputation (FTC lawsuit over fake listings). Roomi and SpareRoom have traction in specific cities. The opportunity is a mobile-first, safety-focused experience that Facebook can't replicate, with verified profiles and structured compatibility data.",
          experiment: "Audit 50 listings across Facebook Marketplace, Roomster, and Craigslist in NYC. Count: response rate to inquiries, average response time, and % of listings that appear fraudulent. This quantifies the pain point and gives you a benchmark to beat.",
        },
        {
          name: "Financial Viability",
          score: 6,
          verdict: "yellow_flag",
          analysis:
            "Monetization is the structural weakness. Once a user finds a roommate, they leave and rarely return. Subscription models (pay for premium filters, unlimited swipes) can work but conversion rates are low in utility apps (<3%). An alternative: charge a one-time 'verified user' fee or partner with moving services, furniture rentals, and utility companies for affiliate revenue. The TAM is large enough that even modest ARPU at scale could be viable.",
          experiment: "Survey 100 people who recently found roommates: would they have paid $9.99 for a service that guaranteed a compatible, verified roommate within 2 weeks? Segment willingness-to-pay by age, city, and urgency. If >15% say yes, you have a viable subscription floor.",
        },
      ],
    },
  },
  {
    idea: "Netflix for indie films",
    report: {
      overallScore: 5,
      summary:
        "A subscription streaming service dedicated exclusively to independent films. Differentiated by curation and filmmaker economics, but faces the brutal economics of content licensing and competition from well-funded generalist platforms with indie catalogs.",
      angles: [
        {
          name: "Market Demand",
          score: 5,
          verdict: "yellow_flag",
          analysis:
            "There is a passionate audience for indie films — festivals like Sundance and SXSW draw millions of viewers, and the 'film Twitter' / Letterboxd community is highly engaged. However, this audience is relatively small (est. 2-5M hardcore indie fans in the US) and already well-served by MUBI, Criterion Channel, and festival circuit. Mainstream audiences who might casually watch an indie film tend to do so on Netflix or Amazon Prime, where they're already paying for a subscription.",
          experiment: "Create a curated newsletter or Substack recommending one indie film per week with where to stream it. Grow to 10K subscribers. Survey readers: would you pay $7/month for a single service that had all these films? What's the minimum catalog size you'd need to subscribe? This validates both audience size and willingness to pay.",
        },
        {
          name: "Technical Feasibility",
          score: 7,
          verdict: "green_light",
          analysis:
            "Video streaming is a solved technical problem — CDN delivery, adaptive bitrate, DRM, and cross-platform playback (web, iOS, Android, smart TVs) are all achievable with off-the-shelf solutions like Vimeo OTT, Uscreen, or a custom Mux + HLS stack. The real cost isn't tech, it's content delivery bandwidth at scale, which is predictable and manageable.",
          experiment: "Stand up a streaming prototype with 10 public-domain or filmmaker-donated films using Mux. Test on web, iOS, and a smart TV. Measure: playback start time, buffering rate, and video quality. Prove you can deliver a Netflix-quality experience on a startup budget.",
        },
        {
          name: "Competitive Landscape",
          score: 3,
          verdict: "red_flag",
          analysis:
            "This is a red ocean. MUBI (curated indie, 15M+ subscribers), Criterion Channel (classic + indie), and OVID.tv (documentaries, indie) are already serving this exact audience. Netflix and Amazon Prime have massive indie catalogs as part of their $17B+ combined content budgets. Even Apple TV+ is moving into indie with A24 partnerships. Competing requires either exclusive content they can't get or a fundamentally different value proposition — curation alone is hard to defend.",
          experiment: "For one month, track where 50 critically acclaimed indie films from the past 2 years are streaming. Map exclusivity — how many are on MUBI only? Criterion only? Netflix? Nowhere at all? The 'nowhere at all' films represent your potential exclusive acquisition targets. If <10% of quality indies are unstreamable, the content gap is too small.",
        },
        {
          name: "Financial Viability",
          score: 4,
          verdict: "red_flag",
          analysis:
            "Content licensing for indie films costs $5K-50K per title for a 1-2 year window. To build a compelling catalog of 500 films, you'd need $2.5M-25M just in licensing costs — before marketing, platform development, or operations. At $7/month, you'd need ~60K subscribers just to recoup the low-end licensing cost annually, assuming zero other expenses. Revenue-share models with filmmakers (50/50 of subscriber revenue allocated by watch time) are more sustainable but require significant subscriber volume before filmmakers see meaningful income.",
          experiment: "Model 3 scenarios: (1) 100% licensing at $10K avg/title for 200 films, (2) 100% revenue-share with filmmakers, (3) 50/50 hybrid. For each, calculate: number of subscribers needed for breakeven at $7/month with a 24-month runway, assuming $300K/year in non-content opex (platform, team, marketing). Present the 'minimum viable subscriber count' for each model.",
        },
      ],
    },
  },
];

// ── Page Component ────────────────────────────────────────────────────────────

function ExamplesPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
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
            <a
              href="/examples"
              className="text-sm font-medium text-amber-400 transition-colors hover:text-amber-300"
            >
              Examples
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          {/* Page heading */}
          <div className="mb-12 text-center">
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
              Example Reports
            </h1>
            <p className="text-lg text-gray-400">
              See how SteelProof stress-tests startup ideas
            </p>
          </div>

          {/* Report cards */}
          <div className="space-y-16">
            {examples.map(({ idea, report }) => (
              <section key={idea} className="scroll-mt-20">
                {/* Idea title */}
                <h2 className="mb-6 text-center text-2xl font-bold text-gray-100">
                  &ldquo;{idea}&rdquo;
                </h2>

                {/* Overall score */}
                <div className="mb-8 text-center">
                  <div className="mb-3 flex justify-center">
                    <ScoreCircle score={report.overallScore} />
                  </div>
                  <p className="mx-auto max-w-xl text-gray-400">{report.summary}</p>
                </div>

                {/* Angle cards */}
                <div className="mb-8 space-y-4">
                  {report.angles.map((angle, i) => (
                    <AngleCard key={angle.name} angle={angle} index={i} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 rounded-2xl border border-amber-900/50 bg-amber-950/20 p-10 text-center">
            <h2 className="mb-3 text-2xl font-bold text-gray-100">
              Ready to stress-test your own idea?
            </h2>
            <p className="mb-6 text-gray-400">
              Get an AI-powered report with specific experiments to derisk your concept — before you spend months building.
            </p>
            <a
              href="/"
              className="inline-block rounded-xl bg-amber-500 px-8 py-4 text-lg font-semibold text-gray-950 transition-colors hover:bg-amber-400"
            >
              Test your own idea — free
            </a>
            <p className="mt-3 text-xs text-gray-600">First analysis is free. No account required.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-6 text-center text-sm text-gray-600">
        Powered by AI — reports are for guidance only. Always validate with real customers.
      </footer>
    </div>
  );
}
