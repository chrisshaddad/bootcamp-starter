'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BookUp, Loader2 } from 'lucide-react';

import { useLibraryMembers } from '@/hooks/use-library-members';
import { useBookCopies } from '@/hooks/use-book-copies';
import { useRentalActions } from '@/hooks/use-rentals';
import { useDebounce } from '@/hooks/use-debounce';
import { ApiError } from '@/lib/api';
import { RequireRole } from '@/components/require-role';
import { Combobox } from '@/components/combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CheckOutPage() {
  return (
    <RequireRole
      roles={['ORG_ADMIN', 'LIBRARIAN']}
      forbiddenMessage="Only library staff can check out books."
    >
      <CheckOut />
    </RequireRole>
  );
}

function CheckOut() {
  const { checkout } = useRentalActions();

  const [memberSearch, setMemberSearch] = useState('');
  const [copySearch, setCopySearch] = useState('');
  const debouncedMember = useDebounce(memberSearch, 300);
  const debouncedCopy = useDebounce(copySearch, 300);

  const [memberId, setMemberId] = useState<string | null>(null);
  const [copyId, setCopyId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { members, isLoading: membersLoading } = useLibraryMembers({
    search: debouncedMember,
    limit: 10,
  });
  const { bookCopies, isLoading: copiesLoading } = useBookCopies({
    status: 'AVAILABLE',
    search: debouncedCopy,
    limit: 10,
  });

  const memberOptions = useMemo(
    () =>
      (members ?? []).map((m) => ({
        value: m.id,
        label: m.user?.name
          ? `${m.libraryCardNumber} · ${m.user.name}`
          : m.libraryCardNumber,
        description:
          m.membershipStatus !== 'ACTIVE'
            ? `Membership ${m.membershipStatus.toLowerCase()}`
            : (m.user?.email ?? 'Walk-in'),
      })),
    [members],
  );

  const copyOptions = useMemo(
    () =>
      (bookCopies ?? []).map((c) => ({
        value: c.id,
        label: `${c.barcode} · ${c.book.title}`,
        description: c.condition,
      })),
    [bookCopies],
  );

  const reset = () => {
    setMemberId(null);
    setCopyId(null);
    setDueDate('');
    setMemberSearch('');
    setCopySearch('');
  };

  const handleSubmit = async () => {
    if (!memberId || !copyId) return;
    setSubmitting(true);
    try {
      const rental = await checkout({
        memberId,
        bookCopyId: copyId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });
      toast.success(
        `Checked out "${rental.bookCopy.book.title}" · due ${new Date(
          rental.dueDate,
        ).toLocaleDateString()}`,
      );
      reset();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to check out',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Check out</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lend an available copy to a member. A matching reservation is
          fulfilled automatically.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookUp className="h-5 w-5" />
            New loan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Member</Label>
            <Combobox
              options={memberOptions}
              value={memberId}
              onChange={setMemberId}
              onSearchChange={setMemberSearch}
              loading={membersLoading}
              placeholder="Select a member"
              searchPlaceholder="Search card # or name…"
              emptyText="No members found"
            />
          </div>

          <div className="grid gap-2">
            <Label>Available copy</Label>
            <Combobox
              options={copyOptions}
              value={copyId}
              onChange={setCopyId}
              onSearchChange={setCopySearch}
              loading={copiesLoading}
              placeholder="Select a copy"
              searchPlaceholder="Search barcode or title…"
              emptyText="No available copies found"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dueDate">Due date (optional)</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Defaults to 14 days from today if left blank.
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!memberId || !copyId || submitting}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking out…
              </>
            ) : (
              'Check out'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
