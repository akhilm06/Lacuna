import type { NextConfig } from "next";

// Keep aligned with `LACUNA_FAVICON_PATH` in `src/lib/favicon.ts` (do not import `src/` here).
const LACUNA_FAVICON_PATH = "/lacuna-mark.svg";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/favicon.ico", destination: LACUNA_FAVICON_PATH }];
  },
  async headers() {
    if (process.env.NODE_ENV !== "development") {
      return [];
    }
    return [
      {
        source: LACUNA_FAVICON_PATH,
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
      {
        source: "/favicon.ico",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
