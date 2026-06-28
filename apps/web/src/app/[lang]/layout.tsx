import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Noto_Kufi_Arabic } from 'next/font/google';
import { notFound } from 'next/navigation';

import '../globals.css';

import { AuthProvider } from '@/components/layout/auth-provider';
import { DirectionProvider } from '@/components/layout/direction-provider';
import { ReduxProvider } from '@/store/provider';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import { getDirection, isLocale, locales, type Locale } from '@/i18n/config';

const jakartaSans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

const notoKufiArabic = Noto_Kufi_Arabic({
  variable: '--font-noto-kufi',
  subsets: ['arabic'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Forward Mena — Property Management',
  description: 'Multi-org property management SaaS for modern landlords',
};

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;

  if (!isLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const direction = getDirection(locale);

  return (
    <html
      lang={locale}
      dir={direction}
      suppressHydrationWarning
      className={`${jakartaSans.variable} ${notoKufiArabic.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <ReduxProvider>
              <DirectionProvider direction={direction} locale={locale}>
                {children}
              </DirectionProvider>
            </ReduxProvider>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
