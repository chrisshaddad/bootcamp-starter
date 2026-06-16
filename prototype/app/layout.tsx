import type { Metadata } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Margin — Know your margins. Grow your profit.",
  description:
    "Margin helps small businesses understand and improve profitability: track sales and expenses, see real profitability metrics, and get AI insights tied to your numbers.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${manrope.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <StoreProvider>
          <TooltipProvider delay={200}>{children}</TooltipProvider>
          <Toaster theme="dark" position="top-right" richColors />
        </StoreProvider>
      </body>
    </html>
  );
}
