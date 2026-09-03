import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  safeJsonLd,
} from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "VIDAN — Эх орны хөрснөөс таны гарт",
    template: "%s | VIDAN",
  },
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "mn_MN",
    siteName: SITE_NAME,
    title: "VIDAN — Эх орны хөрснөөс таны гарт",
    description: DEFAULT_DESCRIPTION,
    url: "/",
    images: [{ url: DEFAULT_OG_IMAGE, alt: "VIDAN брэнд" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "VIDAN — Эх орны хөрснөөс таны гарт",
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/vidan-icon.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="mn"
      className={`${inter.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink-900">
        {children}
      </body>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": `${SITE_URL}/#organization`,
            name: "Дөрвөн Өлзий ХХК",
            alternateName: "VIDAN",
            url: SITE_URL,
            logo: `${SITE_URL}/vidan-logo.png`,
            foundingDate: "1996",
            email: "info@durvun-ulzii.mn",
            telephone: ["+976-7575-2525", "+976-9407-0800"],
            address: {
              "@type": "PostalAddress",
              addressCountry: "MN",
              addressLocality: "Улаанбаатар",
              streetAddress: "Баянгол дүүрэг, 20-р хороо, Үйлдвэрийн баруун бүс ХД-50",
            },
            sameAs: [
              "https://www.facebook.com/vidanofficial",
              "https://www.instagram.com/vidan.brand/",
              "https://www.linkedin.com/company/durvun-ulzii-llc/",
              "https://www.youtube.com/@Marketingdurvunulzii",
            ],
          }),
        }}
      />
      <GoogleAnalytics />
    </html>
  );
}
