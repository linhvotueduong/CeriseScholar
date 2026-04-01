import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {},
  webpack: (config) => {
    // PDF.js needs canvas to be treated as an external module on the server
    config.resolve.alias.canvas = false;
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking — don't allow embedding in iframes
          { key: "X-Frame-Options", value: "DENY" },
          // Stop browsers from MIME-sniffing the content type
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Control what info is sent in the Referer header
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Enforce HTTPS for 1 year (enable once you have SSL)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Restrict what the browser is allowed to do
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
