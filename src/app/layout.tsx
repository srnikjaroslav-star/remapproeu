import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://tabulka-modern.vercel.app'),
  title: "REMAPPRO Management Suite",
  description: "Professional service management and analytics platform",
  openGraph: {
    title: "REMAPPRO Management Suite",
    description: "Professional service management and analytics platform",
    url: 'https://tabulka-modern.vercel.app',
    siteName: 'REMAPPRO',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'REMAPPRO Logo',
      },
    ],
    locale: 'sk_SK',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
