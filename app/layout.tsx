import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import "./globals.css";

const deploymentUrl = process.env.NEXT_PUBLIC_SITE_URL;
const metadataBase = (() => {
  try {
    return new URL(deploymentUrl ?? "https://alias.app");
  } catch {
    return new URL("https://alias.app");
  }
})();

const title =
  "Alias | AI-connected operating system for modern small businesses";
const description =
  "Alias unifies websites, payroll, marketing, and more into one AI-guided workspace powered by MCP integrations for growing small businesses.";

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: title,
    template: "%s | Alias",
  },
  description,
  keywords: [
    "Alias",
    "small business",
    "AI assistant",
    "business automation",
    "marketing automation",
    "payroll",
    "website builder",
    "multichannel management",
  ],
  authors: [{ name: "Alias" }],
  category: "business",
  applicationName: "Alias",
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "Alias",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/photos/dark/logoHorizontal.png",
        width: 500,
        height: 500,
        alt: "Alias transparent logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    site: "@alias",
    creator: "@alias",
    images: ["/photos/dark/logoHorizontal.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      {
        url: "/photos/light/logoClear.png",
        type: "image/png",
        sizes: "500x500",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
      <head>
        <link rel="icon" href="photos/light/logo.png" style={{ borderRadius: "50%" }} />
      </head>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
