import type { Metadata } from "next";
// Self-hosted icon font (Apache-2.0), so no request goes to Google Fonts
import "material-symbols/outlined.css";
// Fonts (OFL-1.1) bundled from npm: the build never contacts Google Fonts
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/latin-800.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "./globals.css";

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
    <html lang="en">
      <body className="font-sans text-sm antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
