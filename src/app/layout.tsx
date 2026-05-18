import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/domain/Navbar";
import { Footer } from "@/components/domain/Footer";
import { CompareProvider } from "@/hooks/useCompare";
import { CompareTray } from "@/components/domain/CompareTray";

const playfairDisplayHeading = Playfair_Display({subsets:['latin'],variable:'--font-heading'});

const notoSans = Noto_Sans({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ModelIndex — AI Model Benchmark Hub",
    template: "%s | ModelIndex",
  },
  description:
    "Data-dense comparison and benchmarking platform for AI models. Compare performance, cost, and capabilities across 350+ frontier models.",
  keywords: ["AI models", "LLM benchmarks", "model comparison", "AI pricing", "GPT", "Claude", "Gemini", "Llama"],
  openGraph: {
    title: "ModelIndex — AI Model Benchmark Hub",
    description:
      "Compare performance, cost, and capabilities across 350+ frontier AI models. Real-time benchmarks, pricing, and leaderboards.",
    url: "https://modelindex.dev",
    siteName: "ModelIndex",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ModelIndex — AI Model Benchmark Hub",
    description:
      "Compare performance, cost, and capabilities across 350+ frontier AI models.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "dark", "antialiased", geistSans.variable, geistMono.variable, "font-sans", notoSans.variable, playfairDisplayHeading.variable)}
    >
      <body className="min-h-full flex flex-col">
        <CompareProvider>
          <Navbar />
          {children}
          <Footer />
          <CompareTray />
        </CompareProvider>
      </body>
    </html>
  );
}
