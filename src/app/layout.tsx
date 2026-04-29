import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { TopNav } from "@/components/top-nav";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Numbers Don't Lie — Wellness analytics",
  description:
    "Health profiles, BMI & wellness scoring, AI insights, and progress visualization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${jetMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers>
          <TopNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
