'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { UserCircle } from 'lucide-react';
import { useProfile } from '@/hooks/use-profile';
import { ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  INSTITUTION_ADMIN: 'Institution Admin',
  STAFF: 'Staff',
  PROFESSIONAL: 'Professional',
  PATIENT: 'Patient',
};

export default function ProfilePage() {
  const { profile, isLoading, updateProfile } = useProfile();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName);
    setPhone(profile.phone);
    setBio(profile.bio ?? '');
  }, [profile]);

  if (isLoading || !profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const isProfessional = profile.role === 'PROFESSIONAL';

  const onSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        fullName,
        phone,
        ...(isProfessional ? { bio: bio || null } : {}),
      });
      toast.success('Profile updated');
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to update profile',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your own account information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCircle className="h-5 w-5" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <p className="text-sm text-muted-foreground">
                {ROLE_LABELS[profile.role] || profile.role}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Institution</Label>
            <p className="text-sm text-muted-foreground">
              {profile.institutionName}
            </p>
          </div>

          {isProfessional && (
            <>
              <div className="space-y-2">
                <Label>Specialty</Label>
                <p className="text-sm text-muted-foreground">
                  {profile.specialty}
                  <span className="ml-2 text-xs">
                    (set by your institution admin)
                  </span>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short bio your patients will see on your care-team profile."
                />
              </div>
            </>
          )}

          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
