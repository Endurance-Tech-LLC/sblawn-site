import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone server build: runs as a container on Azure Container Apps.
  output: "standalone",
  // Dev only: let browsers/phones on the home network open the dev server by LAN IP
  // (e.g. http://192.168.50.219:3000) without Next blocking its HMR/dev scripts.
  allowedDevOrigins: ["192.168.*.*"],
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
