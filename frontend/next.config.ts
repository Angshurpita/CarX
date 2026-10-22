import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // In local development, proxy API calls to the FastAPI backend.
  // In production (Vercel), vercel.json handles the routing, so these
  // rewrites only apply when BACKEND_URL is set (i.e., local dev).
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
      return [];
    }
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: "/health",
        destination: `${backendUrl}/health`,
      },
      {
        source: "/docs",
        destination: `${backendUrl}/docs`,
      },
      {
        source: "/openapi.json",
        destination: `${backendUrl}/openapi.json`,
      },
    ];
  },
};

export default nextConfig;
