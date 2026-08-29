import type { NextConfig } from "next";
import path from "path";

const nextConfig: any = {
  devIndicators: false,
  experimental: {
    turbopack: {
      root: path.resolve(__dirname),
    },
  },
};

export default nextConfig;
