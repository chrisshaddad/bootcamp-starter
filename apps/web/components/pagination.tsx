'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Windowed page numbers with ellipses so the control stays compact for large
 * page counts, e.g. 1 … 4 5 6 … 20. Always includes first and last page.
 */
function getPageItems(current: number, count: number): (number | 'gap')[] {
  if (count <= 7) {
    return Array.from({ length: count }, (_, i) => i + 1);
  }
  const items: (number | 'gap')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(count - 1, current + 1);
  if (start > 2) items.push('gap');
  for (let p = start; p <= end; p++) items.push(p);
  if (end < count - 1) items.push('gap');
  items.push(count);
  return items;
}

interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{' '}
        <span className="font-medium text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        {getPageItems(page, pageCount).map((item, i) =>
          item === 'gap' ? (
            <span
              key={`gap-${i}`}
              className="px-1.5 text-sm text-muted-foreground"
            >
              …
            </span>
          ) : (
            <Button
              key={item}
              variant={item === page ? 'default' : 'outline'}
              size="sm"
              className="min-w-9"
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
