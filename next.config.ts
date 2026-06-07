import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.ngrok.app",
  ],
  // Repo's .git lives in the parent dir, so Turbopack mis-infers the workspace
  // root as the parent. Pin it to the project dir (where npm run dev runs).
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
