import { cache, type ReactNode } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  ExternalLink,
  FolderGit2,
  Github,
  Globe,
  Linkedin,
  MapPin,
} from 'lucide-react';
import { developerPublicProfileResponseSchema } from '@repo/contracts';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProjectListCard } from '@/components/project-list-card';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const getDeveloperProfile = cache(async (slug: string) => {
  const response = await fetch(
    `${API_URL}/users/developers/${encodeURIComponent(slug)}`,
    { cache: 'no-store' },
  );
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error('Unable to load developer profile');
  const payload: unknown = await response.json();
  return developerPublicProfileResponseSchema.parse(payload);
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getDeveloperProfile(slug);
  const description =
    profile.bio ??
    profile.headline ??
    `Explore ${profile.displayName}'s published software projects.`;

  return {
    title: `${profile.displayName} | Deployfolio`,
    description,
    openGraph: {
      title: `${profile.displayName} | Deployfolio`,
      description,
      images: profile.profilePictureUrl ? [profile.profilePictureUrl] : [],
    },
  };
}

export default async function DeveloperPublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getDeveloperProfile(slug);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="relative flex-1 overflow-hidden px-6 py-10 sm:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(47,120,238,0.2),transparent_55%)]" />
        <div className="relative mx-auto max-w-5xl space-y-10">
          <section className="grid gap-8 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-5">
              <Avatar className="h-40 w-40 border-4 border-background shadow-lg md:h-48 md:w-48">
                <AvatarImage
                  src={profile.profilePictureUrl ?? undefined}
                  alt={profile.displayName}
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary-base text-5xl font-semibold text-white">
                  {profile.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat
                  value={profile.stats.publishedProjects}
                  label="Projects"
                />
                <Stat value={profile.stats.ownedProjects} label="Owned" />
                <Stat
                  value={profile.stats.collaborationProjects}
                  label="Collaborations"
                />
              </div>
            </div>

            <div className="space-y-5 pt-1">
              <div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {profile.displayName}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  @{profile.publicSlug}
                </p>
                {profile.headline && (
                  <p className="mt-3 text-lg font-medium">{profile.headline}</p>
                )}
              </div>

              {profile.bio && (
                <p className="max-w-2xl whitespace-pre-line text-sm leading-7 text-muted-foreground">
                  {profile.bio}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {profile.location && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </span>
                )}
                {profile.githubUrl && (
                  <SocialButton href={profile.githubUrl} label="GitHub">
                    <Github className="h-4 w-4" />
                  </SocialButton>
                )}
                {profile.linkedinUrl && (
                  <SocialButton href={profile.linkedinUrl} label="LinkedIn">
                    <Linkedin className="h-4 w-4" />
                  </SocialButton>
                )}
                {profile.personalWebsiteUrl && (
                  <SocialButton
                    href={profile.personalWebsiteUrl}
                    label="Website"
                  >
                    <Globe className="h-4 w-4" />
                  </SocialButton>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <div>
              <h2 className="text-xl font-bold">Published work</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Projects this developer owns or contributes to through a
                verified GitHub collaboration.
              </p>
            </div>

            {profile.projects.length === 0 ? (
              <Card className="border-dashed py-14 text-center">
                <CardContent className="space-y-2">
                  <FolderGit2 className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="font-medium">No published projects yet</p>
                  <p className="text-sm text-muted-foreground">
                    Draft and archived projects remain private.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {profile.projects.map((project, index) => (
                  <ProjectListCard
                    key={project.id}
                    index={index}
                    project={{
                      id: project.id,
                      title: project.title,
                      shortDescription: project.shortDescription,
                      logoUrl: project.logoUrl,
                      coverImageUrl: project.coverImageUrl,
                      status: 'PUBLISHED',
                      role: project.role,
                    }}
                    href={`/projects/${project.slug}`}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-card px-1 py-2">
      <p className="font-semibold">{value}</p>
      <p className="whitespace-nowrap text-[9px] tracking-tight text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function SocialButton({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Button asChild variant="outline" size="sm">
      <a href={href} target="_blank" rel="noreferrer">
        {children}
        {label}
        <ExternalLink className="h-3 w-3" />
      </a>
    </Button>
  );
}
