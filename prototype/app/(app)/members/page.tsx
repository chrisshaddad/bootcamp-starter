"use client";

import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/app/page-header";
import { UserAvatar } from "@/components/app/user-avatar";
import { RoleBadge, StatusBadge } from "@/components/app/badges";
import { InviteButton } from "@/components/app/invite-button";
import { FormSelect } from "@/components/app/form-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "MEMBER", label: "Member" },
];

export default function MembersPage() {
  const { orgData, isAdmin, currentUser, dispatch } = useStore();
  if (!orgData) return null;

  const members = [...orgData.members].sort((a, b) =>
    a.joinedAt < b.joinedAt ? -1 : 1,
  );
  const adminCount = members.filter((m) => m.role === "ADMIN").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description={`${members.length} ${members.length === 1 ? "person" : "people"} in ${orgData.organization.name}.`}
      >
        <InviteButton />
      </PageHeader>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Member</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const isLastAdmin = m.role === "ADMIN" && adminCount === 1;
              const isYou = m.userId === currentUser?.id;
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar name={m.user.name} color={m.user.avatarColor} />
                      <span className="font-medium text-foreground">
                        {m.user.name}
                        {isYou && (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            (you)
                          </span>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.user.email}
                  </TableCell>
                  <TableCell>
                    {isAdmin && !isLastAdmin ? (
                      <div className="w-32">
                        <FormSelect
                          value={m.role === "SUPER_ADMIN" ? "ADMIN" : m.role}
                          onValueChange={(role) =>
                            dispatch({
                              type: "SET_MEMBER_ROLE",
                              memberId: m.id,
                              role,
                            })
                          }
                          options={ROLE_OPTIONS}
                        />
                      </div>
                    ) : (
                      <span
                        title={
                          isLastAdmin
                            ? "Can't change the role of the last Admin"
                            : undefined
                        }
                      >
                        <RoleBadge role={m.role} />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(m.joinedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <StatusBadge status={m.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {!isAdmin && (
        <p className="text-sm text-muted-foreground">
          Only Admins can invite people or change roles.
        </p>
      )}
    </div>
  );
}
