import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Playground — Compare Models Side by Side",
  description:
    "Send a prompt to GPT-4o, Claude Sonnet, and Grok simultaneously. Compare responses, latency, tokens, and cost.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${jetbrainsMono.variable} font-mono antialiased bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
