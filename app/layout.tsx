import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono"
});

export const metadata: Metadata = {
  title: "Unreal Addon Architect",
  description:
    "Design, prototype, and export Unreal Engine add-ons directly in the browser."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetBrainsMono.variable}`}>
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
