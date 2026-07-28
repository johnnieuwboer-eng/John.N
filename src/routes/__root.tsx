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
          "Stop Building Startups Nobody Wants | SteelProof",
      },
      {
        name: "description",
        content:
          "Get an AI-powered investor-style review of your startup idea in under 5 minutes. Find hidden risks, discover competitors, and get actionable next steps. Free first report.",
      },
      { name: "robots", content: "index, follow" },
      { name: "author", content: "SteelProof" },
      { name: "theme-color", content: "#f59e0b" },
      { property: "og:title", content: "Stop Building Startups Nobody Wants | SteelProof" },
      { property: "og:description", content: "Get an AI-powered investor-style review of your startup idea in under 5 minutes. Find hidden risks, discover competitors, and get actionable next steps. Free first report." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://steelproof.ctonew.app" },
      { property: "og:site_name", content: "SteelProof" },
      { property: "og:image", content: "https://steelproof.ctonew.app/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Stop Building Startups Nobody Wants | SteelProof" },
      { name: "twitter:description", content: "Get an AI-powered investor-style review of your startup idea in under 5 minutes. Find hidden risks, discover competitors, and get actionable next steps. Free first report." },
      { name: "twitter:image", content: "https://steelproof.ctonew.app/og-image.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: "https://steelproof.ctonew.app" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "alternate", hrefLang: "en", href: "https://steelproof.ctonew.app" },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "SteelProof",
              url: "https://steelproof.ctonew.app",
              description:
                "AI-powered startup idea validator that stress-tests your concept before you build.",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "9.99",
                priceCurrency: "EUR",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-dvh bg-gray-950 text-gray-100 antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
