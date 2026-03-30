import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use webpack instead of Turbopack (needed for PDF.js canvas alias)
  turbopack: {},
  webpack: (config) => {
    // PDF.js needs canvas to be treated as an external module on the server
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
