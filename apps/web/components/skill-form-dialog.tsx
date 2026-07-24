'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { SkillResponse } from '@repo/contracts';
import { useSkillMutations } from '@/hooks/use-skills';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const skillFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  category: z.string().min(2, 'Category must be at least 2 characters').max(50),
});

type SkillFormValues = z.infer<typeof skillFormSchema>;

interface SkillFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill?: SkillResponse;
}

export function SkillFormDialog({
  open,
  onOpenChange,
  skill,
}: SkillFormDialogProps) {
  const isEdit = !!skill;
  const { createSkill, updateSkill } = useSkillMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SkillFormValues>({
    resolver: zodResolver(skillFormSchema),
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: skill?.name ?? '',
      category: skill?.category ?? '',
    });
  }, [open, skill, reset]);

  const onSubmit = async (values: SkillFormValues) => {
    setIsSubmitting(true);
    try {
      if (isEdit && skill) {
        await updateSkill(skill.id, values);
        toast.success('Skill updated');
      } else {
        await createSkill(values);
        toast.success('Skill created');
      }
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Skill' : 'Add Skill'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g. TypeScript"
              className="h-10 rounded-lg border-gray-200 bg-white text-sm"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              placeholder="e.g. Engineering"
              className="h-10 rounded-lg border-gray-200 bg-white text-sm"
              aria-invalid={!!errors.category}
              {...register('category')}
            />
            {errors.category && (
              <p className="text-sm text-destructive">
                {errors.category.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary-base hover:bg-primary-base/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                'Save Changes'
              ) : (
                'Add Skill'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
