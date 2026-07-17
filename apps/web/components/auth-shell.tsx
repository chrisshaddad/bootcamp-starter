import type { ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  sideContent?: ReactNode;
}

export function AuthShell({
  title,
  description,
  children,
  footer,
  sideContent,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="relative flex flex-1 items-center justify-center overflow-x-hidden px-6 py-6 sm:py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(47,120,238,0.25),transparent_60%)]" />

        {/* Widened container to max-w-6xl to accommodate the grid */}
        <div className="relative flex w-full max-w-6xl flex-col lg:flex-row gap-8 lg:gap-12 items-center lg:items-start justify-center pt-8">
          <div className="w-full max-w-md shrink-0">
            <Card className="border-white/10 shadow-[0_0_60px_-15px_rgba(47,120,238,0.45)]">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>{children}</CardContent>
            </Card>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {footer}
            </p>
          </div>

          {/* Let the side content grow up to 3xl */}
          {sideContent && (
            <div className="w-full lg:max-w-3xl">{sideContent}</div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
