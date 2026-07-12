'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Stethoscope, Plus, X } from 'lucide-react';
import type { PatientDetailResponse } from '@repo/contracts';
import { ApiError } from '@/lib/api';
import { useAssignments } from '@/hooks/use-assignments';
import { useUsers } from '@/hooks/use-users';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  patient: PatientDetailResponse;
  canManage: boolean;
  onChange: () => void;
}

function AssignDialog({
  patientId,
  onChange,
}: {
  patientId: string;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { users } = useUsers({ role: 'PROFESSIONAL', isActive: true, enabled: open });
  const { assignProfessional } = useAssignments(patientId, {
    enabled: false,
    onChange,
  });

  const onAssign = async () => {
    if (!selected) return;
    setIsSubmitting(true);
    try {
      await assignProfessional(selected);
      toast.success('Professional assigned');
      setSelected('');
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
    <Dialog open={open} onOpenChange={setOpen}>
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
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger>
            <SelectValue placeholder="Select a professional" />
          </SelectTrigger>
          <SelectContent>
            {users?.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.fullName}
                {u.specialty ? ` — ${u.specialty}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button onClick={onAssign} disabled={!selected || isSubmitting}>
            {isSubmitting ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogFooter>
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
          <p className="py-4 text-center text-sm text-gray-500">
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
                  <div className="font-medium text-gray-900">
                    {member.fullName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {member.specialty || 'Professional'} · {member.phone}
                  </div>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-red-600"
                    onClick={() => onRemove(member.assignmentId)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
