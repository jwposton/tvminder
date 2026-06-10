import { readFileSync } from "fs";
import { join } from "path";
import type { NextConfig } from "next";

const pkg = JSON.parse(
  readFileSync(join(__dirname, "package.json"), "utf8")
) as { version: string };

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.APP_VERSION ?? pkg.version,
  },
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
  },
};

export default nextConfig;
