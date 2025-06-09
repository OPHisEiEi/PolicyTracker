import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Prompt } from "next/font/google";

const prompt = Prompt({
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-prompt",
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PolicyTraker",
  description: "ระบบติดตามนโยบาย",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
         className={`${prompt.variable} ${geistSans.variable} ${geistMono.variable} font-prompt antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

