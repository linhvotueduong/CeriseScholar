import type { Metadata } from "next";
import { Roboto, Montserrat, PT_Mono } from "next/font/google";
import "./globals.css";
import FlowGuide from "../components/FlowGuide";

// Paper design system fonts
const roboto = Roboto({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
});

const montserrat = Montserrat({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const ptMono = PT_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Cerise Scholar",
  description: "A research tool for PDF reading, highlighting, and synthesized literature reviews",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${montserrat.variable} ${ptMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">{children}<FlowGuide /></body>
    </html>
  );
}
