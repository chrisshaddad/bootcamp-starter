import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { SWRProvider } from '@/lib/swr-provider';
import { DarkModeProvider } from '@/components/dark-mode-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'GymFlow',
  description: 'Modern gym management platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var mode = localStorage.getItem('gym-theme-mode');
                  var isDark = mode === 'dark' || (!mode || mode === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (isDark) document.documentElement.classList.add('dark');
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${manrope.variable} font-sans antialiased`}>
        <DarkModeProvider>
          <TooltipProvider>
            <SWRProvider>
              {children}
              <Toaster richColors position="top-right" />
            </SWRProvider>
          </TooltipProvider>
        </DarkModeProvider>
      </body>
    </html>
  );
}
