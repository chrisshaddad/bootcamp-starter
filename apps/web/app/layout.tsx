import type { Metadata } from 'next';
import {
  Manrope,
  Hanken_Grotesk,
  Newsreader,
  IBM_Plex_Mono,
} from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { SWRProvider } from '@/lib/swr-provider';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700'],
});

// Design 4 "Horizontal Deck" typefaces
const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  weight: ['400', '500', '600', '700'],
});

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  weight: ['400', '500'],
  style: ['normal', 'italic'],
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-plex-mono',
  weight: ['400', '500', '600'],
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
      <body
        className={`${manrope.variable} ${hanken.variable} ${newsreader.variable} ${plexMono.variable} font-sans antialiased`}
      >
        <SWRProvider>
          {children}
          <Toaster richColors position="top-right" />
        </SWRProvider>
      </body>
    </html>
  );
}
