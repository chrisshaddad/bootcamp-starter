'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Shield,
  Bell,
  Link2,
  AlertTriangle,
  Eye,
  EyeOff,
  Github,
  CheckCircle2,
  KeyRound,
  Mail,
} from 'lucide-react';
import type { UserResponse } from '@repo/contracts';
import { useNotificationPreferences } from '@/hooks/use-notification-preferences';
import { useAuth, useUser } from '@/hooks/use-auth';
import { apiPost, ApiError } from '@/lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SettingsTabsProps {
  user: UserResponse;
}

function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function SecurityTab({ email }: { email: string }) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Fill in your current and new password');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Unable to update password',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <KeyRound className="text-muted-foreground h-4.5 w-4.5" />
            Password
          </CardTitle>
          <CardDescription>
            Update the password you use to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PasswordField
            id="current-password"
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
          />
          <PasswordField
            id="new-password"
            label="New password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
          />
          <PasswordField
            id="confirm-password"
            label="Confirm new password"
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />
        </CardContent>
        <CardFooter className="justify-end border-t">
          <Button onClick={handleUpdatePassword} disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update password'}
          </Button>
        </CardFooter>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Mail className="text-muted-foreground h-4.5 w-4.5" />
            Email address
          </CardTitle>
          <CardDescription>
            The email you use to sign in and receive notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-3">
            <Input value={email} disabled className="max-w-sm" />
            <span className="bg-success/15 text-success-dark inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase">
              <CheckCircle2 className="h-3 w-3" />
              Verified
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            To change your email address, contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsTab() {
  const { preferences, isLoading, updatePreferences } =
    useNotificationPreferences();
  const [isSaving, setIsSaving] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [productUpdates, setProductUpdates] = useState(false);

  const projectInvitations = preferences?.projectInvitationEmails ?? true;

  const handleProjectInvitationsChange = async (checked: boolean) => {
    setIsSaving(true);
    try {
      await updatePreferences({ projectInvitationEmails: checked });
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to update this preference',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Bell className="text-muted-foreground h-4.5 w-4.5" />
          Email notifications
        </CardTitle>
        <CardDescription>Choose what we email you about.</CardDescription>
      </CardHeader>
      <CardContent className="divide-border divide-y">
        <div className="flex items-start justify-between gap-6 py-4 first:pt-0">
          <div className="space-y-1">
            <p className="text-sm font-medium">Project invitations</p>
            <p className="text-muted-foreground max-w-md text-xs">
              Get notified by email when someone invites you to collaborate on a
              project.
            </p>
          </div>
          <Switch
            checked={projectInvitations}
            onCheckedChange={handleProjectInvitationsChange}
            disabled={isLoading || isSaving}
            aria-label="Toggle project invitation emails"
          />
        </div>
        <div className="flex items-start justify-between gap-6 py-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Weekly digest</p>
            <p className="text-muted-foreground max-w-md text-xs">
              A weekly summary of activity on your projects and saved profiles.
            </p>
          </div>
          <Switch
            checked={weeklyDigest}
            onCheckedChange={setWeeklyDigest}
            aria-label="Toggle weekly digest emails"
          />
        </div>
        <div className="flex items-start justify-between gap-6 py-4 last:pb-0">
          <div className="space-y-1">
            <p className="text-sm font-medium">Product updates</p>
            <p className="text-muted-foreground max-w-md text-xs">
              Occasional news about new features and improvements.
            </p>
          </div>
          <Switch
            checked={productUpdates}
            onCheckedChange={setProductUpdates}
            aria-label="Toggle product update emails"
          />
        </div>
      </CardContent>
      <CardFooter className="border-t">
        <p className="text-muted-foreground text-xs">
          Changes save automatically.
        </p>
      </CardFooter>
    </Card>
  );
}

function RecruiterNotificationsTab() {
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [productUpdates, setProductUpdates] = useState(false);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Bell className="text-muted-foreground h-4.5 w-4.5" />
          Email notifications
        </CardTitle>
        <CardDescription>Choose what we email you about.</CardDescription>
      </CardHeader>
      <CardContent className="divide-border divide-y">
        <div className="flex items-start justify-between gap-6 py-4 first:pt-0">
          <div className="space-y-1">
            <p className="text-sm font-medium">Weekly digest</p>
            <p className="text-muted-foreground max-w-md text-xs">
              A weekly summary of activity on your projects and saved profiles.
            </p>
          </div>
          <Switch
            checked={weeklyDigest}
            onCheckedChange={setWeeklyDigest}
            aria-label="Toggle weekly digest emails"
          />
        </div>
        <div className="flex items-start justify-between gap-6 py-4 last:pb-0">
          <div className="space-y-1">
            <p className="text-sm font-medium">Product updates</p>
            <p className="text-muted-foreground max-w-md text-xs">
              Occasional news about new features and improvements.
            </p>
          </div>
          <Switch
            checked={productUpdates}
            onCheckedChange={setProductUpdates}
            aria-label="Toggle product update emails"
          />
        </div>
      </CardContent>
      <CardFooter className="border-t">
        <p className="text-muted-foreground text-xs">
          Changes save automatically.
        </p>
      </CardFooter>
    </Card>
  );
}

function ConnectedAccountsTab({
  githubUsername,
}: {
  githubUsername: string | null;
}) {
  const { mutate } = useUser();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConnectGithub = () => {
    window.location.href = `${
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    }/github/connect`;
  };

  const handleDisconnectGithub = async () => {
    setIsDisconnecting(true);
    try {
      await apiPost('/github/disconnect');
      mutate();
      toast.success('GitHub account disconnected');
      setConfirmOpen(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to disconnect GitHub',
      );
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Link2 className="text-muted-foreground h-4.5 w-4.5" />
            GitHub
          </CardTitle>
          <CardDescription>
            Link GitHub to verify project ownership and contributions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                <Github className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {githubUsername ? `@${githubUsername}` : 'Not connected'}
                </p>
                <p className="text-muted-foreground text-xs">
                  {githubUsername
                    ? 'Your GitHub account is linked to this profile.'
                    : 'Connect to verify repositories you own.'}
                </p>
              </div>
            </div>
            {githubUsername ? (
              <div className="flex items-center gap-2.5">
                <span className="bg-success/15 text-success-dark inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase">
                  Connected
                </span>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmOpen(true)}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button onClick={handleConnectGithub}>
                <Github className="h-4 w-4" />
                Connect GitHub
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect GitHub?</DialogTitle>
            <DialogDescription>
              {githubUsername ? `@${githubUsername}` : 'Your GitHub account'}{' '}
              will no longer be linked to your profile. You can reconnect it
              anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isDisconnecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnectGithub}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? 'Disconnecting...' : 'Yes, disconnect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DangerZoneTab() {
  const router = useRouter();
  const { deactivateAccount } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleDeactivate = async () => {
    if (!password) {
      toast.error('Enter your password to confirm');
      return;
    }

    setIsDeactivating(true);
    try {
      await deactivateAccount({ password });
      toast.success('Your account has been deactivated');
      setConfirmOpen(false);
      setPassword('');
      router.replace('/login');
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Unable to deactivate account',
      );
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <>
      <Card className="border-destructive/30 shadow-sm">
        <CardHeader className="bg-destructive/5 border-b">
          <CardTitle className="text-destructive flex items-center gap-2 text-base font-semibold">
            <AlertTriangle className="h-4.5 w-4.5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium">Deactivate account</p>
              <p className="text-muted-foreground max-w-md text-xs">
                Your profile and projects are hidden immediately. Reactivate
                anytime by contacting support.
              </p>
            </div>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive shrink-0"
              onClick={() => setConfirmOpen(true)}
            >
              Deactivate account
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate your account?</DialogTitle>
            <DialogDescription>
              Enter your password to confirm. This hides your profile and
              projects immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="deactivate-password">Password</Label>
            <Input
              id="deactivate-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isDeactivating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={isDeactivating}
            >
              {isDeactivating ? 'Deactivating...' : 'Yes, deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const DEVELOPER_SETTINGS_TABS = [
  'security',
  'notifications',
  'connected',
  'danger',
] as const;
const RECRUITER_SETTINGS_TABS = [
  'security',
  'notifications',
  'danger',
] as const;

type DeveloperSettingsTab = (typeof DEVELOPER_SETTINGS_TABS)[number];
type RecruiterSettingsTab = (typeof RECRUITER_SETTINGS_TABS)[number];

function useInitialTab<T extends string>(tabs: readonly T[], fallback: T) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get('tab');
  const initialTab: T = (tabs as readonly string[]).includes(requested ?? '')
    ? (requested as T)
    : fallback;

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  };

  return { initialTab, handleTabChange };
}

function DeveloperSettingsTabs({ user }: SettingsTabsProps) {
  const githubUsername = user.developerProfile?.githubUsername ?? null;
  const { initialTab, handleTabChange } = useInitialTab<DeveloperSettingsTab>(
    DEVELOPER_SETTINGS_TABS,
    'security',
  );

  return (
    <Tabs value={initialTab} onValueChange={handleTabChange}>
      <div className="overflow-x-auto">
        <TabsList>
          <TabsTrigger value="security">
            <Shield />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="connected">
            <Link2 />
            Connected Accounts
          </TabsTrigger>
          <TabsTrigger value="danger">
            <AlertTriangle />
            Danger Zone
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="security" className="mt-6">
        <SecurityTab email={user.email} />
      </TabsContent>
      <TabsContent value="notifications" className="mt-6">
        <NotificationsTab />
      </TabsContent>
      <TabsContent value="connected" className="mt-6">
        <ConnectedAccountsTab githubUsername={githubUsername} />
      </TabsContent>
      <TabsContent value="danger" className="mt-6">
        <DangerZoneTab />
      </TabsContent>
    </Tabs>
  );
}

function RecruiterSettingsTabs({ user }: SettingsTabsProps) {
  const { initialTab, handleTabChange } = useInitialTab<RecruiterSettingsTab>(
    RECRUITER_SETTINGS_TABS,
    'security',
  );

  return (
    <Tabs value={initialTab} onValueChange={handleTabChange}>
      <div className="overflow-x-auto">
        <TabsList>
          <TabsTrigger value="security">
            <Shield />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="danger">
            <AlertTriangle />
            Danger Zone
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="security" className="mt-6">
        <SecurityTab email={user.email} />
      </TabsContent>
      <TabsContent value="notifications" className="mt-6">
        <RecruiterNotificationsTab />
      </TabsContent>
      <TabsContent value="danger" className="mt-6">
        <DangerZoneTab />
      </TabsContent>
    </Tabs>
  );
}

export function SettingsTabs({ user }: SettingsTabsProps) {
  if (user.accountType === 'HIRING') {
    return <RecruiterSettingsTabs user={user} />;
  }

  return <DeveloperSettingsTabs user={user} />;
}
