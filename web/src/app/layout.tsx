import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/Web3Provider";
import { ToastProvider } from "@/components/ui/Toast";
import { ModalProvider } from "@/components/ui/modals/ModalContext";
import { LoadingProvider } from "@/components/ui/motion/LoadingContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://meridian-treasury.io"),
  title: {
    default: "Meridian | Treasury OS",
    template: "%s | Meridian Treasury OS",
  },
  description:
    "AI-native autonomous treasury and settlement operating system for cross-border commerce. Built on Arc Network with USDC.",
  keywords: [
    "treasury",
    "USDC",
    "escrow",
    "Arc Network",
    "cross-border",
    "B2B",
    "stablecoin",
    "agentic",
  ],
  openGraph: {
    title: "Meridian Treasury OS",
    description:
      "Autonomous Treasury & Settlement OS for Cross-Border SMEs",
    url: "https://meridian-treasury.io",
    siteName: "Meridian Treasury OS",
    type: "website",
    images: [
      {
        url: "https://meridian-treasury.io/og-image.png",
        width: 1200,
        height: 630,
        alt: "Meridian Treasury OS Dashboard Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Meridian Treasury OS",
    description: "Autonomous Treasury & Settlement OS for Cross-Border SMEs",
    images: ["https://meridian-treasury.io/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-64x64.png", sizes: "64x64", type: "image/png" },
      { url: "/favicon-128x128.png", sizes: "128x128", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" }
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#0891b2"
      }
    ]
  },
  manifest: "/site.webmanifest"
};

import { CircleAuthModal } from "@/components/CircleAuthModal";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <Web3Provider>
          <ToastProvider>
            <ModalProvider>
              <LoadingProvider>
                {children}
                <CircleAuthModal />
              </LoadingProvider>
            </ModalProvider>
          </ToastProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
