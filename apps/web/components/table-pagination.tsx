'use client';

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface TablePaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

/**
 * Presentational Prev/Next pager driven by `page`/`total`/`limit`. Hidden when
 * there's only one page. Shared by the staff list screens (2.2+).
 */
export function TablePagination({
  page,
  total,
  limit,
  onPageChange,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (totalPages <= 1) {
    return null;
  }

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages} · {total} total
      </p>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              aria-disabled={!canPrev}
              className={
                !canPrev ? 'pointer-events-none opacity-50' : undefined
              }
              onClick={(e) => {
                e.preventDefault();
                if (canPrev) onPageChange(page - 1);
              }}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              href="#"
              aria-disabled={!canNext}
              className={
                !canNext ? 'pointer-events-none opacity-50' : undefined
              }
              onClick={(e) => {
                e.preventDefault();
                if (canNext) onPageChange(page + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
