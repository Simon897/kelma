/**
 * Where the site lives. Both come from the GitHub Pages workflow (actions/configure-pages):
 * - on simon897.github.io/kelma: base path "/kelma", URL "https://simon897.github.io/kelma"
 * - on a custom domain: base path "", URL "https://your-domain"
 * Locally they default to the root.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kelma.example";

/** Prefix a public/ file path with the base path. next/link and next/font do this themselves. */
export function asset(path: string): string {
  return `${BASE_PATH}${path}`;
}

// Ġabra's own site (mlrs.research.um.edu.mt/resources/gabra/) has redirected to um.edu.mt since
// at least 29 Sep 2026. Point the credit at MLRS's GitHub, which hosts Ġabra's code, until it returns.
export const GABRA_URL = "https://github.com/MLRS";
export const LICENCE_URL = "https://creativecommons.org/licenses/by/4.0/";
