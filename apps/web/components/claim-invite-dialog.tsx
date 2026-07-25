'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { libraryMemberClaimInviteRequestSchema } from '@repo/contracts';
import type {
  LibraryMemberClaimInviteRequest,
  LibraryMemberResponse,
} from '@repo/contracts';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface ClaimInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: LibraryMemberResponse | null;
  onInvite: (
    id: string,
    body: LibraryMemberClaimInviteRequest,
  ) => Promise<unknown>;
}

export function ClaimInviteDialog({
  open,
  onOpenChange,
  member,
  onInvite,
}: ClaimInviteDialogProps) {
  const form = useForm<LibraryMemberClaimInviteRequest>({
    resolver: zodResolver(libraryMemberClaimInviteRequestSchema),
    defaultValues: { email: '', name: '' },
  });

  const onSubmit = async (values: LibraryMemberClaimInviteRequest) => {
    if (!member) return;
    try {
      await onInvite(member.id, values);
      toast.success(`Claim invite sent to ${values.email}`);
      form.reset({ email: '', name: '' });
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to send claim invite',
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset({ email: '', name: '' });
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send claim invite</DialogTitle>
          <DialogDescription>
            They&apos;ll receive an email to sign in and manage this membership
            online.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jamie Rivera" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="jamie@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Sending...' : 'Send invite'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
