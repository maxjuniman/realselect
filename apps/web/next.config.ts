import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  compiler: {
    styledComponents: {
      displayName: true,
      ssr: true,
    },
  },
  output: "standalone",
  outputFileTracingRoot: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
  async rewrites() {
    const api = process.env.API_PROXY_URL || "http://localhost:3333";
    return [
      {
        source: "/backend/:path*",
        destination: `${api}/:path*`,
      },
    ];
  },
};

export default nextConfig;
