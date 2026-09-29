// TODO(launch): set NEXT_PUBLIC_SITE_URL to the real domain; hreflang/canonical URLs use it.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kelma.example";

// Ġabra's own site (mlrs.research.um.edu.mt/resources/gabra/) has redirected to um.edu.mt since
// at least 29 Sep 2026. Point the credit at MLRS's GitHub, which hosts Ġabra's code, until it returns.
export const GABRA_URL = "https://github.com/MLRS";
export const LICENCE_URL = "https://creativecommons.org/licenses/by/4.0/";
