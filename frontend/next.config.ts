import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // In local development or standalone deployments, proxy API calls to the FastAPI backend.
  // In unified Vercel monorepo deployments, vercel.json rewrites route /api to the backend.
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
    if (backendUrl && !backendUrl.startsWith("/")) {
      const cleanUrl = backendUrl.replace(/\/+$/, "");
      return [
        {
          source: "/api/v1/:path*",
          destination: `${cleanUrl}/api/v1/:path*`,
        },
        {
          source: "/health",
          destination: `${cleanUrl}/health`,
        },
        {
          source: "/docs",
          destination: `${cleanUrl}/docs`,
        },
        {
          source: "/openapi.json",
          destination: `${cleanUrl}/openapi.json`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
