import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone server build: runs as a container on Azure Container Apps.
  output: "standalone",
  // Match WordPress URLs (/product/slug/) so existing links and SEO keep working.
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      // Current WordPress media. Swap for the Azure CDN host once images move to Blob Storage.
      new URL("https://www.sblawnsystems.com/wp-content/uploads/**"),
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
