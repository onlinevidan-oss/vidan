import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Барааны холбоос (slug) солигдоход хуучин холбоос ажилласаар байх ёстой —
   * хуваалцсан линк, хайлтын систем, хэрэглэгчийн сагсанд хадгалагдсан
   * холбоос 404 болохгүй. Slug солих бүрд энд мөр нэмнэ.
   * (Хуучин захиалга slug хадгалдаггүй — order_items-д нэр, product_id л бий.)
   */
  async redirects() {
    return [
      // 2026-10-14: зөгийн бал VIDAN022 нь 920г (агуулахын файлаар баталсан)
      {
        source: "/products/zogiin-bal-720g",
        destination: "/products/zogiin-bal-920g",
        permanent: true,
      },
    ];
  },
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
