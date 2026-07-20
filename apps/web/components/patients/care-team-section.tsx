'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Stethoscope, Plus, X, Mail, Phone, Copy } from 'lucide-react';
import type { CareTeamMember, PatientDetailResponse } from '@repo/contracts';
import { ApiError } from '@/lib/api';
import { useAssignments } from '@/hooks/use-assignments';
import { useUsers } from '@/hooks/use-users';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Props {
  patient: PatientDetailResponse;
  canManage: boolean;
  onChange: () => void;
}

interface SelectedProfessional {
  id: string;
  fullName: string;
  specialty: string | null;
}

function AssignDialog({
  patientId,
  onChange,
}: {
  patientId: string;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selected, setSelected] = useState<SelectedProfessional | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search server-side rather than fetching every professional up front —
  // with a couple hundred of them, a plain unfiltered dropdown is unusable.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const { users, isLoading } = useUsers({
    role: 'PROFESSIONAL',
    isActive: true,
    search: debouncedQuery || undefined,
    enabled: open && !selected,
  });

  const { assignProfessional } = useAssignments(patientId, {
    enabled: false,
    onChange,
  });

  const reset = () => {
    setSelected(null);
    setQuery('');
    setDebouncedQuery('');
  };

  const onAssign = async () => {
    if (!selected) return;
    setIsSubmitting(true);
    try {
      await assignProfessional(selected.id);
      toast.success('Professional assigned');
      reset();
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to assign',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Assign
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Professional</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {selected ? (
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <div className="text-sm font-medium text-foreground">
                  {selected.fullName}
                </div>
                {selected.specialty && (
                  <div className="text-xs text-muted-foreground">
                    {selected.specialty}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(null)}
              >
                Change
              </Button>
            </div>
          ) : (
            <>
              <Input
                placeholder="Search by name or specialty..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              <div className="max-h-56 overflow-y-auto rounded-md border border-border">
                {isLoading ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    Searching...
                  </p>
                ) : !users?.length ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    No matching professionals
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {users.map((u) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                          onClick={() =>
                            setSelected({
                              id: u.id,
                              fullName: u.fullName,
                              specialty: u.specialty,
                            })
                          }
                        >
                          <div className="font-medium text-foreground">
                            {u.fullName}
                          </div>
                          {u.specialty && (
                            <div className="text-xs text-muted-foreground">
                              {u.specialty}
                            </div>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onAssign} disabled={!selected || isSubmitting}>
            {isSubmitting ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function copyToClipboard(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied to clipboard`);
  } catch {
    toast.error(`Failed to copy ${label.toLowerCase()}`);
  }
}

function ContactRow({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Mail;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm text-foreground">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{value}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => copyToClipboard(value, label)}
        aria-label={`Copy ${label.toLowerCase()}`}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function ProfessionalProfileDialog({ member }: { member: CareTeamMember }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          View Profile
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{member.fullName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm font-medium text-primary-base">
            {member.specialty || 'Professional'}
          </p>
          <p className="text-sm text-muted-foreground">
            {member.bio || 'No bio provided yet.'}
          </p>
          <div className="space-y-2 border-t border-border pt-4">
            <ContactRow icon={Mail} value={member.email} label="Email" />
            <ContactRow icon={Phone} value={member.phone} label="Phone" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CareTeamSection({ patient, canManage, onChange }: Props) {
  const { removeAssignment } = useAssignments(patient.id, {
    enabled: false,
    onChange,
  });

  const onRemove = async (assignmentId: string) => {
    try {
      await removeAssignment(assignmentId);
      toast.success('Professional removed from care team');
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to remove',
      );
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Stethoscope className="h-5 w-5" />
          Care Team
        </CardTitle>
        {canManage && (
          <AssignDialog patientId={patient.id} onChange={onChange} />
        )}
      </CardHeader>
      <CardContent>
        {!patient.careTeam.length ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No professionals assigned yet
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {patient.careTeam.map((member) => (
              <li
                key={member.assignmentId}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <div className="font-medium text-foreground">
                    {member.fullName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {member.specialty || 'Professional'} · {member.phone}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ProfessionalProfileDialog member={member} />
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-error"
                      onClick={() => onRemove(member.assignmentId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
