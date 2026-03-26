import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "mouth-motorola-locate-qualify.trycloudflare.com",
    "*.trycloudflare.com",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
