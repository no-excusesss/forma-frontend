import type { NextConfig } from "next";

const upstream = process.env.API_UPSTREAM_URL?.replace(/\/$/, "");
if (upstream) {
  const url = new URL(upstream);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/"
  )
    throw new Error(
      "API_UPSTREAM_URL must be an HTTP(S) origin without credentials or a path.",
    );
}

const config: NextConfig = {
  async rewrites() {
    return upstream
      ? [{ source: "/backend/:path*", destination: `${upstream}/:path*` }]
      : [];
  },
};
export default config;
