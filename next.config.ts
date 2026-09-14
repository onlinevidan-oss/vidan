import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cppqssgojhonkhvavfth.supabase.co",
        pathname: "/storage/v1/object/public/products/**",
      },
      {
        protocol: "https",
        hostname: "cppqssgojhonkhvavfth.supabase.co",
        pathname: "/storage/v1/object/public/avatars/**",
      },
    ],
  },
};

export default nextConfig;
