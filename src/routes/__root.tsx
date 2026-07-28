import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        title:
          "AI Startup Idea Validator — Stress-Test Your Idea Before You Build | SteelProof",
      },
      {
        name: "description",
        content:
          "SteelProof is an AI startup idea validator. Get a scored stress-test on market demand, technical feasibility, competition, and financial viability.",
      },
      { name: "robots", content: "index, follow" },
      { name: "author", content: "SteelProof" },
      { name: "theme-color", content: "#f59e0b" },
      { property: "og:title", content: "AI Startup Idea Validator — Stress-Test Your Idea Before You Build | SteelProof" },
      { property: "og:description", content: "SteelProof is an AI startup idea validator. Get a scored stress-test on market demand, technical feasibility, competition, and financial viability." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://steelproof.ctonew.app" },
      { property: "og:site_name", content: "SteelProof" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "AI Startup Idea Validator — Stress-Test Your Idea Before You Build | SteelProof" },
      { name: "twitter:description", content: "SteelProof is an AI startup idea validator. Get a scored stress-test on market demand, technical feasibility, competition, and financial viability." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: "https://steelproof.ctonew.app" },
    ],
  }),
  notFoundComponent: () => <div>Page not found</div>,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh bg-gray-950 text-gray-100 antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
