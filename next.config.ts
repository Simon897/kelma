import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // "/kelma" on simon897.github.io/kelma, "" on a custom domain (set by the Pages workflow).
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  images: { unoptimized: true },
  experimental: {
    globalNotFound: true,
  },
};

export default nextConfig;
