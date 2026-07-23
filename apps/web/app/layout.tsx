import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { SWRProvider } from '@/lib/swr-provider';
import { ModeProvider } from '@/components/mode-provider';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'GymCloud',
  description: 'Multi-tenant gym management, built for modern operations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} font-sans antialiased`}>
        <ModeProvider>
          <SWRProvider>
            {children}
            <Toaster richColors position="top-right" />
          </SWRProvider>
        </ModeProvider>
      </body>
    </html>
  );
}
