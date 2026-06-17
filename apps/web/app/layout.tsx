import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { SWRProvider } from '@/lib/swr-provider';
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
    <html lang="en">
      <body className={`${manrope.variable} dark font-sans antialiased`}>
        <SWRProvider>
          {children}
          <Toaster richColors position="top-right" />
        </SWRProvider>
      </body>
    </html>
  );
}
