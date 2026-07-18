'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Github, Loader2, PlusCircle, Globe } from 'lucide-react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { fetcher, apiPost, ApiError } from '@/lib/api';
import { useUser } from '@/hooks/use-auth';
import {
  githubRepositoryListSchema,
  type GithubRepository,
} from '@repo/contracts';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/pagination';

const PAGE_SIZE = 9;

export default function NewProjectPage() {
  const { user, isLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const [importingUrl, setImportingUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const isConnected = !!user?.developerProfile?.githubUsername;

  const {
    data: repositories,
    error: reposError,
    isLoading: reposLoading,
  } = useSWR<GithubRepository[]>(
    isConnected ? '/github/my-repositories' : null,
    async (key: string) => githubRepositoryListSchema.parse(await fetcher(key)),
  );

  const importableRepositories =
    repositories?.filter((repository) => !repository.isImported) ?? [];
  const importedRepositories =
    repositories?.filter((repository) => repository.isImported) ?? [];

  const totalPages = Math.ceil(importableRepositories.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const pageRepositories = importableRepositories.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
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
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pageRepositories.map((repo) => (
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
                        <Globe className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
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
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleImport(repo.url)}
                        disabled={importingUrl !== null}
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
                    </CardContent>
                  </Card>
                ))}

                {repositories.length === 0 && (
                  <div className="col-span-full py-12 text-center text-muted-foreground">
                    No supported public repositories owned by this GitHub
                    account were found.
                  </div>
                )}
                {repositories.length > 0 &&
                  importableRepositories.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground">
                      Every supported repository has already been imported.
                    </div>
                  )}
              </div>

              {totalPages > 1 && (
                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              )}

              {importedRepositories.length > 0 && (
                <section className="space-y-3 border-t pt-6">
                  <div>
                    <h2 className="font-semibold">Already imported</h2>
                    <p className="text-sm text-muted-foreground">
                      These supported repositories already have projects.
                    </p>
                  </div>
                  <div className="divide-y rounded-lg border">
                    {importedRepositories.map((repo) => (
                      <div
                        key={repo.id}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {repo.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {repo.fullName}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                          Already imported
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
