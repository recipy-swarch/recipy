import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb", // Cambia el límite a 1MB
    }
  }
};

export default nextConfig;
