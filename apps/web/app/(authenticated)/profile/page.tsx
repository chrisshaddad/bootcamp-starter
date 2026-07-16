'use client';

import { useMemo, useState } from 'react';
import { Pencil, Plus, Target, Layers, X } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/hooks/use-auth';
import { useEmployee } from '@/hooks/use-employee';
import { useSkills } from '@/hooks/use-skills';
import { ApiError } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SkillRating } from '@/components/skill-rating';
import { SkillPickerDialog } from '@/components/skill-picker-dialog';
import { EditProfileDialog } from '@/components/edit-profile-dialog';

function formatTenure(createdAt: string | Date): string {
  const start = new Date(createdAt);
  const months = (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

  if (months < 1) return 'New';
  if (months < 12) return `${Math.floor(months)}mo tenure`;
  return `${Math.floor(months / 12)}y tenure`;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useUser();
  const { employee, isLoading, updateSkills, updateProfile } = useEmployee(
    user?.id,
  );
  const { skills: allSkills } = useSkills();

  const [editOpen, setEditOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const availableSkills = useMemo(() => {
    const existingIds = new Set(employee?.skills.map((s) => s.id) ?? []);
    return (allSkills ?? []).filter((skill) => !existingIds.has(skill.id));
  }, [allSkills, employee]);

  if (isLoading || !employee) {
    return <LoadingSkeleton />;
  }

  const handleAddSkill = (skillId: string, proficiencyLevel: number) => {
    return updateSkills({
      skills: [
        ...employee.skills.map((s) => ({
          skillId: s.id,
          proficiencyLevel: s.proficiencyLevel,
        })),
        { skillId, proficiencyLevel },
      ],
    });
  };

  const handleChangeLevel = async (skillId: string, level: number) => {
    try {
      await updateSkills({
        skills: employee.skills.map((s) => ({
          skillId: s.id,
          proficiencyLevel: s.id === skillId ? level : s.proficiencyLevel,
        })),
      });
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    try {
      await updateSkills({
        skills: employee.skills
          .filter((s) => s.id !== skillId)
          .map((s) => ({
            skillId: s.id,
            proficiencyLevel: s.proficiencyLevel,
          })),
      });
      toast.success('Skill removed');
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" />
          Edit Profile
        </Button>
      </div>

      <Card className="gap-3 border-gray-200 p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-lg font-semibold text-primary-base">
            {employee.name
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="space-y-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {employee.name}
              </h2>
              {employee.title && (
                <p className="text-sm text-gray-500">{employee.title}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
              {employee.level && (
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5">
                  L{employee.level}
                </span>
              )}
              {employee.department && (
                <span className="text-gray-500">
                  {employee.department.name}
                </span>
              )}
              <span className="text-gray-500">
                {formatTenure(employee.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="gap-2 border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Bio</h3>
        <p className="text-sm text-gray-600">
          {employee.profile?.bio || 'No bio added yet.'}
        </p>
      </Card>

      <Card className="gap-2 border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Career Goals</h3>
        </div>
        <p className="text-sm text-gray-600">
          {employee.profile?.careerGoal || 'No career goals added yet.'}
        </p>
      </Card>

      <Card className="gap-3 border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Skills</h3>
            <span className="text-xs text-gray-500">
              {employee.skills.length} skills
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPickerOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Skill
          </Button>
        </div>

        {!employee.skills.length ? (
          <p className="text-sm text-gray-500">No skills added yet.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {employee.skills.map((skill) => (
              <div
                key={skill.id}
                className="group flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
              >
                <span className="text-sm font-medium text-gray-900">
                  {skill.name}
                </span>
                <SkillRating
                  level={skill.proficiencyLevel}
                  onChange={(level) => handleChangeLevel(skill.id, level)}
                />
                <button
                  type="button"
                  aria-label={`Remove ${skill.name}`}
                  onClick={() => handleRemoveSkill(skill.id)}
                  className="text-gray-300 hover:text-error"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        bio={employee.profile?.bio ?? null}
        careerGoal={employee.profile?.careerGoal ?? null}
        onSave={updateProfile}
      />

      <SkillPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        availableSkills={availableSkills}
        onAdd={handleAddSkill}
      />
    </div>
  );
}
