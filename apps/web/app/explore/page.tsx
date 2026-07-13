'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Project {
  id: string;
  title: string;
  slug: string;
  logoUrl: string | null;
  shortDescription: string | null;
  fullDescription: string | null;
  deploymentUrl: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

interface ExploreResponse {
  data: Project[];
  meta: {
    totalItems: number;
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export default function ExplorePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'alphabetical'>(
    'newest',
  );
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<ExploreResponse['meta'] | null>(null);

  useEffect(() => {
    async function fetchExplore() {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams({
          page: String(page),
          limit: '9',
          sort,
        });
        if (search) {
          queryParams.append('search', search);
        }

        const res = await fetch(
          `http://localhost:3001/projects/explore?${queryParams.toString()}`,
        );
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.statusText}`);
        }
        const responseData: ExploreResponse = await res.json();
        setProjects(responseData.data);
        setMeta(responseData.meta);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchExplore();
  }, [page, search, sort]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSort(e.target.value as 'newest' | 'oldest' | 'alphabetical');
    setPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">
          Explore Projects
        </h1>
        <p className="text-muted-foreground font-medium text-sm">
          Discover published creations and tools from the community.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder="Search projects by keyword..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Sort By
          </span>
          <select
            value={sort}
            onChange={handleSortChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="newest">Newest Published</option>
            <option value="oldest">Oldest Published</option>
            <option value="alphabetical">Alphabetical (A-Z)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      ) : error ? (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-8">
          <p>Error: {error}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-card text-card-foreground">
          <h3 className="text-lg font-semibold mb-1">No projects found</h3>
          <p className="text-muted-foreground">
            Try refining your search keyword.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {projects.map((project) => (
              <div
                key={project.id}
                className="rounded-lg border bg-card text-card-foreground shadow-sm flex flex-col hover:shadow-md transition-shadow h-full"
              >
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-4 mb-4">
                    {project.logoUrl ? (
                      <img
                        src={project.logoUrl}
                        alt={`${project.title} logo`}
                        className="w-12 h-12 rounded-lg object-cover bg-muted"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                        {project.title.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg leading-tight truncate">
                        {project.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {project.publishedAt
                          ? `Published ${new Date(project.publishedAt).toLocaleDateString()}`
                          : 'Not published'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                    {project.shortDescription || 'No description provided.'}
                  </p>
                </div>
                <div className="p-6 pt-0 border-t bg-muted/30 flex justify-between items-center text-sm">
                  <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-primary text-primary-foreground">
                    {project.status}
                  </span>
                  <Link
                    href={`/projects/${project.slug}`}
                    className="text-sm font-medium hover:underline text-primary"
                  >
                    View Project &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex justify-between items-center mt-8 pt-4 border-t">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!meta.hasPreviousPage}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {meta.currentPage} of {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={!meta.hasNextPage}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
