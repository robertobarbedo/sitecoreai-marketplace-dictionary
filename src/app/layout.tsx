import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
// Self-hosted icon font (Apache-2.0), so no request goes to Google Fonts
import "material-symbols/outlined.css";
import "./globals.css";

// Downloaded at build time and served from this deployment
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Dictionary Editor",
  description: "SitecoreAI Marketplace Dictionary Editor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans text-sm antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
