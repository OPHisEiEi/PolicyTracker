import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "static.scientificamerican.com",
      "firebasestorage.googleapis.com", 
    ],
  },
  experimental: {
    
  },
};

export default nextConfig;
