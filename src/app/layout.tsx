import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ScrollToTop } from "@/components/ScrollToTop";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});
const display = Inter({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700"],
});
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Freeway — learn by building",
    template: "%s · Freeway",
  },
  description:
    "AI-generated, hands-on engineering courses. Pick a path, answer a few questions, and learn by doing.",
  keywords: [
    "engineering education",
    "AI courses",
    "interactive learning",
    "software engineering",
    "mechanical engineering",
  ],
  openGraph: {
    title: "Freeway — learn by building",
    description:
      "Personalized software, mechanical, and AI engineering courses with interactive exercises.",
    type: "website",
    siteName: "Freeway",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Freeway — learn by building",
    description:
      "AI-generated engineering courses with hands-on exercises, videos, and forum support.",
  },
};

export const viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${sans.variable} ${display.variable} ${mono.variable} font-sans antialiased`}
      >
        <div className="min-h-dvh bg-white text-foreground">
          {children}
          <ScrollToTop />
        </div>
      </body>
    </html>
  );
}
