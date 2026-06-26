'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useOrganizationSettings } from '@/hooks/use-organization-settings';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useOrganizations } from '@/hooks/use-organizations';
import useSWR, { mutate as globalMutate } from 'swr';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  organizationUpdateRequestSchema,
  userProfileUpdateRequestSchema,
  type UserResponse,
  type OrganizationUpdateRequest,
  type UserProfileUpdateRequest,
} from '@repo/contracts';
import { fetcher } from '@/lib/api';
import { toast } from 'sonner';
import { Settings, Users, UserCircle2, Plus } from 'lucide-react';

const MAX_IMAGE_DIMENSION = 512;
const JPEG_QUALITY = 0.82;

async function compressImageToDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();

  const loaded = await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Failed to read image'));
    image.src = objectUrl;
  });

  void loaded;

  const scale = Math.min(
    1,
    MAX_IMAGE_DIMENSION / Math.max(image.width, image.height),
  );
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    URL.revokeObjectURL(objectUrl);
    throw new Error('Image processing is not supported in this browser');
  }

  ctx.drawImage(image, 0, 0, width, height);
  URL.revokeObjectURL(objectUrl);

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

export default function SettingsPage() {
  const {
    data: user,
    isLoading: authLoading,
    mutate: refreshUser,
  } = useSWR<UserResponse>('/auth/me', fetcher);
  const { organizations } = useOrganizations();
  const currentOrg = organizations?.find((o) => o.id === user?.organizationId);
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'organization' | 'members'>('profile');

  const { getOrganization, updateOrganization } = useOrganizationSettings(
    user?.organizationId,
  );
  const { updateProfile } = useUserProfile();
  const [organizationName, setOrganizationName] = useState<string | null>(null);

  const [orgSaving, setOrgSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Organization form
  const orgForm = useForm<OrganizationUpdateRequest>({
    resolver: zodResolver(organizationUpdateRequestSchema),
    defaultValues: {
      name: currentOrg?.name || '',
      description: null,
      website: currentOrg?.website || null,
    },
  });

  // Profile form
  const profileForm = useForm<UserProfileUpdateRequest>({
    resolver: zodResolver(userProfileUpdateRequestSchema),
    defaultValues: {
      name: user?.name || '',
      profilePictureUrl: user?.profile?.avatarUrl || null,
      phoneNumber: user?.profile?.phone || null,
      bio: user?.profile?.bio || null,
      street1: user?.profile?.street1 || null,
      street2: user?.profile?.street2 || null,
      city: user?.profile?.city || null,
      state: user?.profile?.state || null,
      postalCode: user?.profile?.postalCode || null,
      country: user?.profile?.country || null,
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name || '',
        profilePictureUrl: user.profile?.avatarUrl || null,
        phoneNumber: user.profile?.phone || null,
        bio: user.profile?.bio || null,
        street1: user.profile?.street1 || null,
        street2: user.profile?.street2 || null,
        city: user.profile?.city || null,
        state: user.profile?.state || null,
        postalCode: user.profile?.postalCode || null,
        country: user.profile?.country || null,
      });
    }
  }, [profileForm, user]);

  useEffect(() => {
    let isMounted = true;

    const loadOrganization = async () => {
      if (!user?.organizationId) return;
      const organization = await getOrganization();
      if (!isMounted || !organization) return;

      setOrganizationName(organization.name);

      orgForm.reset({
        name: organization.name,
        description: organization.description ?? null,
        website: organization.website ?? null,
      });
    };

    void loadOrganization();

    return () => {
      isMounted = false;
    };
  }, [getOrganization, orgForm, user?.organizationId]);

  const handleUpdateOrganization = async (data: OrganizationUpdateRequest) => {
    if (!user?.organizationId) return;
    setOrgSaving(true);
    try {
      await updateOrganization(data);
      toast.success('Organization updated successfully');
      orgForm.reset(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update organization',
      );
    } finally {
      setOrgSaving(false);
    }
  };

  const handleUpdateProfile = async (data: UserProfileUpdateRequest) => {
    setProfileSaving(true);
    try {
      const updatedUser = await updateProfile(data);
      toast.success('Profile updated successfully');
      profileForm.reset(data);
      await globalMutate('/auth/me', updatedUser, { revalidate: true });
      await refreshUser();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update profile',
      );
    } finally {
      setProfileSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account and organization settings
          </p>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const isOrgAdmin = user?.role === 'ORG_ADMIN';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and organization settings
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        <Button variant={activeTab === 'profile' ? 'default' : 'ghost'} onClick={() => setActiveTab('profile')}>
          Profile
        </Button>
        <Button variant={activeTab === 'account' ? 'default' : 'ghost'} onClick={() => setActiveTab('account')}>
          Account
        </Button>
        {isOrgAdmin && (
          <Button variant={activeTab === 'organization' ? 'default' : 'ghost'} onClick={() => setActiveTab('organization')}>
            Organization
          </Button>
        )}
        {isOrgAdmin && (
          <Button variant={activeTab === 'members' ? 'default' : 'ghost'} onClick={() => setActiveTab('members')}>
            Members
          </Button>
        )}
      </div>

      {activeTab === 'profile' && (
        <div className="space-y-4">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                User Profile
              </CardTitle>
              <CardDescription>
                Update your personal details and picture. Changes here show in the top-right avatar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 rounded-3xl border border-border bg-gradient-to-br from-background via-background to-muted/20 p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0">
                    <Avatar className="h-20 w-20 ring-4 ring-background shadow-sm">
                      {(profileForm.watch('profilePictureUrl') ||
                        user?.profile?.avatarUrl) && (
                        <AvatarImage
                          src={
                            profileForm.watch('profilePictureUrl') ||
                            user?.profile?.avatarUrl ||
                            ''
                          }
                          alt="Profile picture"
                          className="object-cover"
                        />
                      )}
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        <UserCircle2 className="h-11 w-11" />
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="profilePictureFile"
                      className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105"
                      aria-label="Upload profile picture"
                    >
                      <Plus className="h-4 w-4" />
                    </label>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">Profile picture</p>
                    <p className="text-sm text-muted-foreground">
                      Click the plus button to upload a new image. The preview updates before you save.
                    </p>
                  </div>
                </div>
              </div>

              <form
                onSubmit={profileForm.handleSubmit(handleUpdateProfile)}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <Label htmlFor="profilePictureFile">Picture upload</Label>
                  <Input
                    id="profilePictureFile"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;

                      try {
                        const compressedDataUrl = await compressImageToDataUrl(file);
                        profileForm.setValue(
                          'profilePictureUrl',
                          compressedDataUrl,
                          { shouldDirty: true, shouldValidate: true },
                        );
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : 'Unable to process image',
                        );
                      }
                    }}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" {...profileForm.register('name')} placeholder="Your full name" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input id="phoneNumber" {...profileForm.register('phoneNumber')} placeholder="Your phone number" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="bio">Bio</Label>
                  <Input id="bio" {...profileForm.register('bio')} placeholder="Tell us about yourself" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="street1">Street Address</Label>
                    <Input id="street1" {...profileForm.register('street1')} placeholder="Street address" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="street2">Street Address 2</Label>
                    <Input id="street2" {...profileForm.register('street2')} placeholder="Apt, suite, etc." />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" {...profileForm.register('city')} placeholder="City" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="state">State / Province</Label>
                    <Input id="state" {...profileForm.register('state')} placeholder="State" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input id="postalCode" {...profileForm.register('postalCode')} placeholder="Postal code" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" {...profileForm.register('country')} placeholder="Country" />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={profileSaving}
                  className="w-full sm:w-auto"
                >
                  {profileSaving ? 'Saving…' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'account' && (
        <div className="space-y-4">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Read-only identity and login info. This tab is informational only.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 ring-2 ring-border">
                    {user?.profile?.avatarUrl && (
                      <AvatarImage
                        src={user.profile.avatarUrl}
                        alt="Profile picture"
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <UserCircle2 className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">
                      {user?.name ?? 'User'}
                    </p>
                  </div>
                </div>

              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p className="mt-1 text-sm text-foreground">{user?.email}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Role</Label>
                <div className="mt-1">
                  <Badge>{user?.role}</Badge>
                </div>
              </div>

              {user?.organizationId && (
                <div>
                  <Label className="text-sm font-medium">Organization</Label>
                  <p className="mt-1 text-sm text-foreground">
                    {organizationName || 'Loading...'}
                  </p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Status</Label>
                <div className="mt-1">
                  <Badge variant={user?.isConfirmed ? 'default' : 'secondary'}>
                    {user?.isConfirmed ? 'Verified' : 'Unverified'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'organization' && isOrgAdmin && (
        <div className="space-y-4">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>
                  Org-admin only. This is where the company record and public-facing basics live.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={orgForm.handleSubmit(handleUpdateOrganization)}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input
                      id="org-name"
                      {...orgForm.register('name')}
                      placeholder="Organization name"
                    />
                    {orgForm.formState.errors.name && (
                      <p className="text-xs text-destructive">
                        {orgForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      {...orgForm.register('description')}
                      placeholder="Organization description"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      {...orgForm.register('website')}
                      placeholder="https://example.com"
                    />
                    {orgForm.formState.errors.website && (
                      <p className="text-xs text-destructive">
                        {orgForm.formState.errors.website.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={orgSaving}
                    className="w-full sm:w-auto"
                  >
                    {orgSaving ? 'Saving…' : 'Save Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>
        </div>
      )}

      {activeTab === 'members' && isOrgAdmin && (
        <div className="space-y-4">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Organization Members
                </CardTitle>
                <CardDescription>
                  {currentOrg?._count?.users || 0} member
                  {currentOrg?._count?.users !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This is a placeholder for member management. Right now it only shows the member count;
                  inviting, removing, and role changes still need work.
                </p>
              </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
