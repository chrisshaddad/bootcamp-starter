'use client';

import { useState } from 'react';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  isActive: boolean;
  name: string;
  /** e.g. "patient", "staff member", "professional" — used in the confirm copy. */
  entityLabel: string;
  onConfirm: () => Promise<void>;
}

/** A clickable ACTIVE/INACTIVE badge that confirms before toggling — replaces a separate action column/menu item. */
export function ActivationStatusBadge({
  isActive,
  name,
  entityLabel,
  onConfirm,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <StatusBadge
        status={isActive ? 'ACTIVE' : 'INACTIVE'}
        onClick={() => setOpen(true)}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>
              {isActive ? 'Deactivate' : 'Reactivate'} {entityLabel}?
            </DialogTitle>
            <DialogDescription>
              {isActive
                ? `${name} will no longer be able to log in until reactivated.`
                : `${name} will regain access immediately.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={isActive ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Saving...'
                : isActive
                  ? 'Deactivate'
                  : 'Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
