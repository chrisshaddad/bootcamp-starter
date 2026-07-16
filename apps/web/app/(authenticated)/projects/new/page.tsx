'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Github, Loader2, PlusCircle, Lock, Globe } from 'lucide-react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { fetcher, apiPost, ApiError } from '@/lib/api';
import { useUser } from '@/hooks/use-auth';
import { type GithubRepository } from '@repo/contracts';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function NewProjectPage() {
  const { user, isLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const [importingUrl, setImportingUrl] = useState<string | null>(null);

  const isConnected = !!user?.developerProfile?.githubUsername;

  const {
    data: repositories,
    error: reposError,
    isLoading: reposLoading,
  } = useSWR<GithubRepository[]>(
    isConnected ? '/github/my-repositories' : null,
    fetcher,
  );

  const handleConnectGithub = () => {
    window.location.href = `${
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    }/github/connect`;
  };

  const handleImport = async (repoUrl: string) => {
    try {
      setImportingUrl(repoUrl);

      const res = await apiPost<{ project: { id: string; slug: string } }>(
        '/projects/import-github',
        {
          repositoryUrl: repoUrl,
        },
      );

      toast.success('Project imported successfully!');
      router.push(`/projects/${res.project.id}/edit`);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Failed to import repository');
      }
    } finally {
      setImportingUrl(null);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Import a project</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Select a repository from your GitHub account to import.
        </p>
      </div>

      {!isConnected ? (
        <Card className="border-dashed py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Github className="mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">
              Connect your GitHub Account
            </h2>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              To import projects seamlessly, connect your GitHub account. We
              will fetch your repositories automatically.
            </p>
            <Button onClick={handleConnectGithub}>
              <Github className="mr-2 h-4 w-4" />
              Connect GitHub
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {reposLoading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-[140px] w-full rounded-xl" />
              ))}
            </div>
          )}

          {reposError && (
            <Card className="border-destructive">
              <CardContent className="py-6 text-center text-destructive">
                Failed to fetch repositories. Please try reconnecting your
                account.
              </CardContent>
            </Card>
          )}

          {repositories && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {repositories.map((repo) => (
                <Card
                  key={repo.id}
                  className="flex flex-col overflow-hidden transition-colors hover:border-primary/50"
                >
                  <CardHeader className="flex-1 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <CardTitle
                        className="truncate text-base font-semibold"
                        title={repo.fullName}
                      >
                        {repo.name}
                      </CardTitle>
                      {repo.isPrivate ? (
                        <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      ) : (
                        <Globe className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    {repo.description && (
                      <CardDescription className="line-clamp-2 mt-1.5 text-xs">
                        {repo.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="border-t bg-muted/20 px-6 py-4 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {repo.language || 'Unknown'}
                    </span>
                    {repo.isPrivate ? (
                      <span className="text-xs text-muted-foreground italic">
                        Private (imports unavailable)
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleImport(repo.url)}
                        disabled={importingUrl === repo.url}
                      >
                        {importingUrl === repo.url ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Import
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}

              {repositories.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  No repositories found on this GitHub account.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
