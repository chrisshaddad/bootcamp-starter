'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { SkillResponse } from '@repo/contracts';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SkillRating } from '@/components/skill-rating';

interface SkillPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableSkills: SkillResponse[];
  onAdd: (skillId: string, proficiencyLevel: number) => Promise<unknown>;
}

export function SkillPickerDialog({
  open,
  onOpenChange,
  availableSkills,
  onAdd,
}: SkillPickerDialogProps) {
  const [skillId, setSkillId] = useState<string>('');
  const [level, setLevel] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSkillId('');
      setLevel(3);
    }
    onOpenChange(nextOpen);
  };

  const handleAdd = async () => {
    if (!skillId) return;
    setIsSubmitting(true);
    try {
      await onAdd(skillId, level);
      toast.success('Skill added');
      handleOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Skill</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="skill">Skill</Label>
            <Select value={skillId} onValueChange={setSkillId}>
              <SelectTrigger
                id="skill"
                className="h-10 w-full rounded-lg border-gray-200 bg-white text-sm"
              >
                <SelectValue placeholder="Select a skill" />
              </SelectTrigger>
              <SelectContent>
                {availableSkills.map((skill) => (
                  <SelectItem key={skill.id} value={skill.id}>
                    {skill.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!availableSkills.length && (
              <p className="text-sm text-gray-500">
                You&apos;ve already added every available skill.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Proficiency</Label>
            <SkillRating level={level} onChange={setLevel} />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!skillId || isSubmitting}
            onClick={handleAdd}
            className="bg-primary-base hover:bg-primary-base/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Skill'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
