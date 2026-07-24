'use client';

import { useMemo, useState } from 'react';
import {
  Briefcase,
  Building2,
  CalendarDays,
  FileText,
  Hash,
  Layers,
  Mail,
  MapPin,
  MapPinned,
  Pencil,
  Phone,
  Plus,
  Target,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/hooks/use-auth';
import { useEmployee } from '@/hooks/use-employee';
import { useSkills } from '@/hooks/use-skills';
import { ApiError } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { SkillRating } from '@/components/skill-rating';
import { SkillPickerDialog } from '@/components/skill-picker-dialog';
import { EditProfileDialog } from '@/components/edit-profile-dialog';
import {
  categoryTone,
  TONE_BORDER_CLASSES,
  TONE_CHIP_CLASSES,
  type Tone,
} from '@/lib/labels';
import { cn } from '@/lib/utils';

const EMPLOYMENT_TYPE_LABELS = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERN: 'Intern',
} as const;

const WORK_ARRANGEMENT_LABELS = {
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
  ONSITE: 'On-site',
} as const;

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatTenure(createdAt: string | Date): string {
  const start = new Date(createdAt);
  const months = (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

  if (months < 1) return 'New';
  if (months < 12) return `${Math.floor(months)}mo tenure`;
  return `${Math.floor(months / 12)}y tenure`;
}

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatAddress(profile: {
  street1: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}): string | null {
  const line1 = [profile.street1, profile.street2].filter(Boolean).join(', ');
  const line2 = [profile.city, profile.state].filter(Boolean).join(', ');
  const line3 = [line2, profile.postalCode].filter(Boolean).join(' ');
  const parts = [line1, line3, profile.country].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/** A labelled value row. Falls back to a muted "Not provided" when empty. */
function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 break-words text-sm text-foreground">
          {value || <span className="text-muted-foreground">Not provided</span>}
        </dd>
      </div>
    </div>
  );
}

function SectionIcon({
  icon: Icon,
  tone = 'neutral',
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone?: Tone;
}) {
  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
        TONE_CHIP_CLASSES[tone],
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

function SectionCard({
  icon,
  title,
  tone = 'neutral',
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tone?: Tone;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <SectionIcon icon={icon} tone={tone} />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-52 w-full rounded-xl" />
      </div>
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

  const profile = employee.profile;
  const address = profile ? formatAddress(profile) : null;

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
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" />
          Edit Profile
        </Button>
      </div>

      {/* Identity header */}
      <Card className="relative gap-5 overflow-hidden p-6 sm:flex-row sm:items-center">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/12 via-violet/6 to-blush/12" />

        <Avatar className="relative h-16 w-16 text-lg ring-4 ring-background">
          {profile?.profilePictureUrl && (
            <AvatarImage src={profile.profilePictureUrl} alt={employee.name} />
          )}
          <AvatarFallback className="bg-gradient-to-br from-primary to-violet font-semibold text-primary-foreground">
            {initials(employee.name)}
          </AvatarFallback>
        </Avatar>

        <div className="relative min-w-0 space-y-2">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {employee.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {employee.title || 'No title set'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {employee.level && <Badge tone="violet">L{employee.level}</Badge>}
            {employee.department && (
              <Badge tone="blush">{employee.department.name}</Badge>
            )}
            {profile?.employmentType && (
              <Badge tone="primary">
                {EMPLOYMENT_TYPE_LABELS[profile.employmentType]}
              </Badge>
            )}
            {profile?.workArrangement && (
              <Badge tone="success">
                {WORK_ARRANGEMENT_LABELS[profile.workArrangement]}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatTenure(employee.createdAt)}
            </span>
          </div>
        </div>
      </Card>

      {/* About */}
      <Card className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 sm:divide-x sm:divide-border">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <SectionIcon icon={FileText} tone="violet" />
            <h3 className="text-sm font-semibold text-foreground">Bio</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {profile?.bio || 'No bio added yet.'}
          </p>
        </div>
        <div className="space-y-2.5 sm:pl-6">
          <div className="flex items-center gap-2.5">
            <SectionIcon icon={Target} tone="blush" />
            <h3 className="text-sm font-semibold text-foreground">
              Career Goals
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {profile?.careerGoal || 'No career goals added yet.'}
          </p>
        </div>
      </Card>

      {/* Contact + Employment */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard icon={UserRound} title="Contact Information" tone="info">
          <dl className="grid gap-4 sm:grid-cols-2">
            <DetailItem icon={Mail} label="Email" value={employee.email} />
            <DetailItem
              icon={Phone}
              label="Phone"
              value={profile?.phoneNumber}
            />
            <DetailItem
              icon={MapPinned}
              label="Location"
              value={[profile?.city, profile?.country]
                .filter(Boolean)
                .join(', ')}
            />
            <DetailItem icon={MapPin} label="Address" value={address} />
          </dl>
        </SectionCard>

        <SectionCard icon={Briefcase} title="Employment Details" tone="primary">
          <dl className="grid gap-4 sm:grid-cols-2">
            <DetailItem
              icon={Building2}
              label="Department"
              value={employee.department?.name}
            />
            <DetailItem
              icon={Layers}
              label="Level"
              value={employee.level ? `L${employee.level}` : null}
            />
            <DetailItem
              icon={UserRound}
              label="Manager"
              value={employee.manager?.name}
            />
            <DetailItem
              icon={CalendarDays}
              label="Start date"
              value={formatDate(employee.createdAt)}
            />
            <DetailItem
              icon={Briefcase}
              label="Employment type"
              value={
                profile?.employmentType
                  ? EMPLOYMENT_TYPE_LABELS[profile.employmentType]
                  : null
              }
            />
            <DetailItem
              icon={Hash}
              label="Employee ID"
              value={
                <span className="font-mono text-xs">
                  #{employee.id.slice(0, 8).toUpperCase()}
                </span>
              }
            />
          </dl>
        </SectionCard>
      </div>

      {/* Skills */}
      <SectionCard
        icon={Layers}
        title="Skills"
        tone="warning"
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPickerOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Skill
          </Button>
        }
      >
        {!employee.skills.length ? (
          <p className="text-sm text-muted-foreground">No skills added yet.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {employee.skills.map((skill) => (
              <div
                key={skill.id}
                className={cn(
                  'group flex items-center gap-2 rounded-lg border border-l-2 border-border bg-card px-3 py-2',
                  TONE_BORDER_CLASSES[categoryTone(skill.category)],
                )}
              >
                <span className="text-sm font-medium text-foreground">
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
                  className="rounded text-muted-foreground/50 transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={employee.profile}
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
