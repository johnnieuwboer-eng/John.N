// Site configuration — read at module init from site.json.
// No createServerFn needed — this is a simple config module.
// The default business name is "SteelProof".

import { readFileSync } from "node:fs";

interface SiteConfig {
  businessName?: string;
}

function loadConfig(): SiteConfig {
  try {
    return JSON.parse(readFileSync("site.json", "utf8")) as SiteConfig;
  } catch {
    return {};
  }
}

export const businessName: string = loadConfig().businessName?.trim() ?? "SteelProof";
