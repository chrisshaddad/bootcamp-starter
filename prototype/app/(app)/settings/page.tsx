"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { computeMetrics } from "@/lib/metrics";
import { PageHeader } from "@/components/app/page-header";
import { UserAvatar } from "@/components/app/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingsPage() {
  const router = useRouter();
  const { orgData, currentUser, isAdmin, dispatch } = useStore();
  const [name, setName] = useState("");

  useEffect(() => {
    if (orgData) setName(orgData.organization.name);
  }, [orgData]);

  if (!orgData || !currentUser) return null;
  const metrics = computeMetrics(orgData);
  const dirty = name.trim() !== "" && name.trim() !== orgData.organization.name;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your organization and profile."
      />

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>
            {isAdmin
              ? "Update your organization details."
              : "Only Admins can change these."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Name</Label>
            <div className="flex items-center gap-2">
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isAdmin}
                className="max-w-sm"
              />
              {isAdmin && (
                <Button
                  disabled={!dirty}
                  onClick={() => {
                    dispatch({ type: "RENAME_ORG", name: name.trim() });
                    toast.success("Organization renamed");
                  }}
                >
                  Save
                </Button>
              )}
            </div>
          </div>
          <div className="grid max-w-md grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Currency</p>
              <p className="text-sm font-medium text-foreground">USD ($)</p>
            </div>
            <div className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Members</p>
              <p className="text-sm font-medium text-foreground">
                {metrics.counts.members}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <UserAvatar
              name={currentUser.name}
              color={currentUser.avatarColor}
              className="size-11"
            />
            <div>
              <p className="font-medium text-foreground">{currentUser.name}</p>
              <p className="text-sm text-muted-foreground">{currentUser.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demo</CardTitle>
          <CardDescription>
            This is a prototype on mock data stored in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => {
              dispatch({ type: "RESET" });
              toast.success("Demo data reset to the bike-shop sample.");
              router.push("/dashboard");
            }}
          >
            <RotateCcw className="size-4" />
            Reset demo data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
