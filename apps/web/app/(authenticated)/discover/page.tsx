'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useOrganizationDirectory } from '@/hooks/use-organizations';
import { usePortalMemberships } from '@/hooks/use-portal-memberships';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Library, Globe } from 'lucide-react';
import { ApiError } from '@/lib/api';
import type {
  OrganizationDirectoryResponse,
  LibraryMembershipType,
} from '@repo/contracts';

type DirectoryLibrary = OrganizationDirectoryResponse['organizations'][number];

export default function DiscoverPage() {
  const { organizations, isLoading, error } = useOrganizationDirectory();
  const { memberships, requestMembership } = usePortalMemberships();
  const [target, setTarget] = useState<DirectoryLibrary | null>(null);
  const [membershipType, setMembershipType] =
    useState<LibraryMembershipType>('REGULAR');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestedSlugs = new Set(
    (memberships ?? []).map((m) => m.organization.slug),
  );

  const handleRequest = async () => {
    if (!target) return;
    setIsSubmitting(true);
    try {
      await requestMembership({
        organizationSlug: target.slug,
        membershipType,
      });
      toast.success(`Request sent to ${target.name}`);
      setTarget(null);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to send request');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Discover Libraries
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse libraries on NextShelf and request access to start borrowing
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="py-10 text-center text-error">
          Failed to load libraries
        </div>
      ) : !organizations?.length ? (
        <div className="py-10 text-center text-muted-foreground">
          No libraries are available yet
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => {
            const alreadyRequested = requestedSlugs.has(org.slug);
            return (
              <Card key={org.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Library className="h-5 w-5 text-library-primary" />
                    {org.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {org.description && (
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {org.description}
                    </p>
                  )}
                  {org.website && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Globe className="h-3.5 w-3.5" />
                      {org.website}
                    </div>
                  )}
                  <Button
                    className="w-full"
                    disabled={alreadyRequested}
                    onClick={() => setTarget(org)}
                  >
                    {alreadyRequested ? 'Already Requested' : 'Request to Join'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join {target?.name}</DialogTitle>
            <DialogDescription>
              Your request will be reviewed by a NextShelf administrator before
              you can borrow from this library.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Membership Type
            </label>
            <Select
              value={membershipType}
              onValueChange={(value) =>
                setMembershipType(value as LibraryMembershipType)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STUDENT">Student</SelectItem>
                <SelectItem value="REGULAR">Regular</SelectItem>
                <SelectItem value="PREMIUM">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTarget(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleRequest} disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
