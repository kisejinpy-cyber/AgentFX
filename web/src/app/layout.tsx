import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/Web3Provider";
import { ToastProvider } from "@/components/ui/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meridian | Treasury OS",
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
    type: "website",
  },
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
            {children}
            <CircleAuthModal />
          </ToastProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
