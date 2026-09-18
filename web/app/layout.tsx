import type { Metadata } from "next";

import { AuthProvider } from "@/components/auth-provider";
import { LanguageProvider } from "@/components/language-provider";
import { MusicProvider } from "@/components/music-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Myne | A small library for large worlds",
    template: "%s | Myne",
  },

  description:
    "Read public-domain books and your own EPUB files in the browser.",

  applicationName: "Myne",

  manifest: "/manifest.webmanifest",

  keywords: [
    "ebooks",
    "EPUB reader",
    "PDF reader",
    "digital library",
    "Project Gutenberg",
  ],
};

export const viewport = {
  themeColor: "#2f6d62",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <AuthProvider>
            <MusicProvider>
              {children}
            </MusicProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
