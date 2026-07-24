'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { SkillResponse } from '@repo/contracts';
import { useUser } from '@/hooks/use-auth';
import { useSkills, useSkillMutations } from '@/hooks/use-skills';
import { categoryTone } from '@/lib/labels';
import { ForbiddenPage } from '@/components/forbidden-page';
import { SkillFormDialog } from '@/components/skill-form-dialog';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PAGE_SIZE = 12;

export default function SkillsPage() {
  const { user } = useUser();
  const isOrgAdmin = user?.role === 'ORG_ADMIN';

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editing, setEditing] = useState<SkillResponse | null>(null);
  const [deleting, setDeleting] = useState<SkillResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Debounce the search box; any new query resets to the first page.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Separate unfiltered fetch used only to populate the category dropdown, so
  // the options stay complete regardless of the current page/search.
  const { skills: allSkills } = useSkills({ enabled: isOrgAdmin });
  const categories = useMemo(
    () =>
      Array.from(new Set((allSkills ?? []).map((s) => s.category))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [allSkills],
  );

  const { skills, total, isLoading, error } = useSkills({
    enabled: isOrgAdmin,
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    category: category === 'all' ? undefined : category,
  });
  const pageCount = total ? Math.ceil(total / PAGE_SIZE) : 0;
  const { deleteSkill } = useSkillMutations();

  if (!isOrgAdmin) {
    return <ForbiddenPage message="Only org admins can manage skills." />;
  }

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsProcessing(true);
    try {
      await deleteSkill(deleting.id);
      toast.success('Skill deleted');
      setDeleting(null);
    } catch {
      toast.error('Failed to delete skill');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Skills</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your organization&apos;s skill catalog
            {total !== undefined && ` · ${total} total`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search skills"
              className="h-10 w-56 pl-9"
            />
          </div>
          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="gap-2 bg-primary-base hover:bg-primary-base/90"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4" />
            Add Skill
          </Button>
        </div>
      </div>

      {/* Skills grid */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-border py-16 text-center text-destructive">
          Failed to load skills
        </div>
      ) : !skills?.length ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-gray-500">
          {search || category !== 'all'
            ? 'No skills match your filters.'
            : 'No skills yet. Add your first one to build the catalog.'}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="group flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {skill.name}
                </p>
                <Badge
                  tone={categoryTone(skill.category)}
                  className="mt-2"
                >
                  {skill.category}
                </Badge>
              </div>
              <div className="flex shrink-0 gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500"
                  onClick={() => setEditing(skill)}
                  aria-label={`Edit ${skill.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-destructive"
                  onClick={() => setDeleting(skill)}
                  aria-label={`Delete ${skill.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && total !== undefined && pageCount > 1 && (
        <Pagination
          page={page}
          pageCount={pageCount}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}

      <SkillFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <SkillFormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        skill={editing ?? undefined}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Skill</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleting?.name}</strong>?
              This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isProcessing}
            >
              {isProcessing ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
