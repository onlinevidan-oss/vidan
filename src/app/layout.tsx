import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
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
  title: "VIDAN — Эрүүл хөрсөнд ургуулсан эрүүл хүнс",
  description:
    "Дөрвөн Өлзий ХХК — VIDAN брэндийн даршилсан ногоо, чанамал, хүүхдийн тэжээл. Үндэсний үйлдвэрлэл, 1998 оноос.",
  icons: { icon: "/vidan-leaf.png" },
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
    </html>
  );
}
