import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { SWRProvider } from '@/lib/swr-provider';
import { NavigationHistoryTracker } from '@/components/navigation-history-tracker';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Bootcamp Starter',
  description: 'Full-stack bootcamp starter',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <SWRProvider>
            <NavigationHistoryTracker />
            {children}
            <Toaster richColors position="top-right" />
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
