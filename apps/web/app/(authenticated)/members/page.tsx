'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Edit,
  Loader2,
  MailPlus,
  Plus,
  RefreshCcw,
  ShieldX,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { useUser } from '@/hooks/use-auth';
import { useMembers, useMemberInvitations } from '@/hooks/use-members';
import { useOrganizations } from '@/hooks/use-organizations';
import { ApiError } from '@/lib/api';
import {
  memberCreateRequestSchema,
  memberInviteRequestSchema,
  memberUpdateRequestSchema,
  type Member,
  type MemberCreateRequest,
  type MemberInvitation,
  type MemberInviteRequest,
  type MemberRole,
  type MemberUpdateRequest,
} from '@repo/contracts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const ROLE_COLORS: Record<MemberRole, string> = {
  ADMIN: 'bg-primary-100 text-primary-base',
  PRESENTER: 'bg-warning-light text-gray-900',
};

function RoleBadge({ role }: { role: MemberRole }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[role]}`}
    >
      {role.charAt(0) + role.slice(1).toLowerCase()}
    </span>
  );
}

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="mb-4 h-16 w-16 text-error" />
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="max-w-md text-center text-gray-500">
        Only super admins and organization admins can manage members.
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function truncateId(id: string) {
  return id.slice(0, 8);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function canAccessMembers(role: string | undefined) {
  return role === 'SUPER_ADMIN' || role === 'ORG_ADMIN';
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function OrganizationField({
  value,
  onChange,
  organizations,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  organizations:
    | Array<{
        id: string;
        name: string;
      }>
    | undefined;
}) {
  return (
    <div className="space-y-2">
      <Label>Organization</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select organization" />
        </SelectTrigger>
        <SelectContent>
          {organizations?.map((organization) => (
            <SelectItem key={organization.id} value={organization.id}>
              {organization.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function MembersPage() {
  const { user, isLoading: userLoading } = useUser();
  const canAccess = canAccessMembers(user?.role);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const { organizations } = useOrganizations({
    enabled: canAccess && isSuperAdmin,
    status: 'ACTIVE',
  });

  const {
    members,
    total,
    isLoading: membersLoading,
    error: membersError,
    createMember,
    updateMember,
    deleteMember,
  } = useMembers({
    enabled: canAccess,
  });

  const {
    invitations,
    total: invitationTotal,
    isLoading: invitationsLoading,
    error: invitationsError,
    inviteMember,
    resendInvitation,
    revokeInvitation,
  } = useMemberInvitations({
    enabled: canAccess,
  });

  const createForm = useForm<MemberCreateRequest>({
    resolver: zodResolver(memberCreateRequestSchema),
    defaultValues: {
      username: '',
      role: 'PRESENTER',
      organizationId: undefined,
    },
  });

  const inviteForm = useForm<MemberInviteRequest>({
    resolver: zodResolver(memberInviteRequestSchema),
    defaultValues: {
      email: '',
      username: '',
      role: 'PRESENTER',
      organizationId: undefined,
    },
  });

  const editForm = useForm<MemberUpdateRequest>({
    resolver: zodResolver(memberUpdateRequestSchema),
    defaultValues: {
      username: '',
      role: 'PRESENTER',
    },
  });

  useEffect(() => {
    if (editingMember) {
      editForm.reset({
        username: editingMember.username,
        role: editingMember.role,
      });
    }
  }, [editForm, editingMember]);

  if (userLoading) {
    return <LoadingSkeleton />;
  }

  if (!canAccess) {
    return <ForbiddenPage />;
  }

  const onCreate = async (body: MemberCreateRequest) => {
    try {
      await createMember(body);
      toast.success('Member created');
      createForm.reset({ username: '', role: 'PRESENTER' });
      setCreateOpen(false);
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to create member'));
    }
  };

  const onInvite = async (body: MemberInviteRequest) => {
    try {
      await inviteMember(body);
      toast.success('Invitation sent');
      inviteForm.reset({ email: '', username: '', role: 'PRESENTER' });
      setInviteOpen(false);
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to send invitation'));
    }
  };

  const onEdit = async (body: MemberUpdateRequest) => {
    if (!editingMember) return;

    try {
      await updateMember(editingMember.id, body);
      toast.success('Member updated');
      setEditingMember(null);
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to update member'));
    }
  };

  const onDelete = async (member: Member) => {
    if (!window.confirm(`Delete ${member.username}?`)) return;

    try {
      await deleteMember(member.id);
      toast.success('Member deleted');
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to delete member'));
    }
  };

  const onResend = async (invitation: MemberInvitation) => {
    try {
      await resendInvitation(invitation.id);
      toast.success('Invitation resent');
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to resend invitation'));
    }
  };

  const onRevoke = async (invitation: MemberInvitation) => {
    if (!window.confirm(`Cancel invitation to ${invitation.email}?`)) return;

    try {
      await revokeInvitation(invitation.id);
      toast.success('Invitation canceled');
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to cancel invitation'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isSuperAdmin
              ? 'Coordly members across active organizations'
              : 'Members in your organization'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Member</DialogTitle>
                <DialogDescription>
                  Add a Coordly member without creating a login account.
                </DialogDescription>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={createForm.handleSubmit(onCreate)}
              >
                <div className="space-y-2">
                  <Label htmlFor="create-username">Username</Label>
                  <Input
                    id="create-username"
                    aria-invalid={!!createForm.formState.errors.username}
                    {...createForm.register('username')}
                  />
                </div>
                <Controller
                  control={createForm.control}
                  name="role"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRESENTER">Presenter</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
                {isSuperAdmin && (
                  <Controller
                    control={createForm.control}
                    name="organizationId"
                    render={({ field }) => (
                      <OrganizationField
                        value={field.value}
                        onChange={field.onChange}
                        organizations={organizations}
                      />
                    )}
                  />
                )}
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createForm.formState.isSubmitting}
                  >
                    {createForm.formState.isSubmitting && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <MailPlus className="h-4 w-4" />
                Invite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Member</DialogTitle>
                <DialogDescription>
                  Send an email invitation and create the member on acceptance.
                </DialogDescription>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={inviteForm.handleSubmit(onInvite)}
              >
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    aria-invalid={!!inviteForm.formState.errors.email}
                    {...inviteForm.register('email')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-username">Username</Label>
                  <Input
                    id="invite-username"
                    aria-invalid={!!inviteForm.formState.errors.username}
                    {...inviteForm.register('username')}
                  />
                </div>
                <Controller
                  control={inviteForm.control}
                  name="role"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRESENTER">Presenter</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
                {isSuperAdmin && (
                  <Controller
                    control={inviteForm.control}
                    name="organizationId"
                    render={({ field }) => (
                      <OrganizationField
                        value={field.value}
                        onChange={field.onChange}
                        organizations={organizations}
                      />
                    )}
                  />
                )}
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={inviteForm.formState.isSubmitting}
                  >
                    {inviteForm.formState.isSubmitting && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Send Invite
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Members
            {total !== undefined && (
              <span className="text-sm font-normal text-gray-500">
                ({total})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : membersError ? (
            <div className="py-10 text-center text-error">
              Failed to load members
            </div>
          ) : !members?.length ? (
            <div className="py-10 text-center text-gray-500">
              No members found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  {isSuperAdmin && <TableHead>Organization</TableHead>}
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-mono text-sm text-gray-500">
                      {truncateId(member.id)}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {member.username}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {member.userEmail ?? 'No login'}
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={member.role} />
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="font-mono text-sm text-gray-500">
                        {truncateId(member.organizationId)}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditingMember(member)}
                          aria-label={`Edit ${member.username}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onDelete(member)}
                          aria-label={`Delete ${member.username}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailPlus className="h-5 w-5" />
            Pending Invitations
            {invitationTotal !== undefined && (
              <span className="text-sm font-normal text-gray-500">
                ({invitationTotal})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invitationsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : invitationsError ? (
            <div className="py-10 text-center text-error">
              Failed to load invitations
            </div>
          ) : !invitations?.length ? (
            <div className="py-10 text-center text-gray-500">
              No pending invitations
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  {isSuperAdmin && <TableHead>Organization</TableHead>}
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium text-gray-900">
                      {invitation.email}
                    </TableCell>
                    <TableCell>{invitation.username}</TableCell>
                    <TableCell>
                      <RoleBadge role={invitation.role} />
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(invitation.expiresAt)}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="font-mono text-sm text-gray-500">
                        {truncateId(invitation.organizationId)}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onResend(invitation)}
                          aria-label={`Resend invitation to ${invitation.email}`}
                        >
                          <RefreshCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onRevoke(invitation)}
                          aria-label={`Cancel invitation to ${invitation.email}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!editingMember}
        onOpenChange={(open) => {
          if (!open) setEditingMember(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Update the member username or role.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={editForm.handleSubmit(onEdit)}>
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                aria-invalid={!!editForm.formState.errors.username}
                {...editForm.register('username')}
              />
            </div>
            <Controller
              control={editForm.control}
              name="role"
              render={({ field }) => (
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRESENTER">Presenter</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={editForm.formState.isSubmitting}>
                {editForm.formState.isSubmitting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
