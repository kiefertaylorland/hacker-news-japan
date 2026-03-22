import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.GITHUB_ACTIONS ? "/hacker-news-japan" : "",
  trailingSlash: true,
  images: { unoptimized: true },
  eslint: {
    dirs: ["src"],
  },
};

export default nextConfig;
