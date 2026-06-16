"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const { state, currentUser } = useStore();
  const { dispatch } = useStore();

  const org =
    state.organizations.find((o) => o.id === token) ?? state.organizations[0];
  const alreadyMember =
    !!currentUser &&
    state.members.some((m) => m.userId === currentUser.id && m.orgId === org.id);

  const [email, setEmail] = useState(currentUser?.email ?? "");
  const needsEmail = !currentUser;
  const canJoin = !needsEmail || EMAIL_RE.test(email);

  const join = () => {
    if (needsEmail) dispatch({ type: "SIGN_IN", email });
    dispatch({ type: "JOIN_ORG", orgId: org.id });
    router.push("/dashboard");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-7 text-center ring-1 ring-foreground/5">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary-soft text-lg font-semibold text-primary-300">
        {org.name[0]}
      </div>
      <p className="text-sm text-muted-foreground">You&apos;ve been invited to join</p>
      <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">
        {org.name}
      </h1>

      {alreadyMember ? (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            You&apos;re already a member of this organization.
          </p>
          <Button
            size="lg"
            className="mt-6 w-full"
            onClick={() => router.push("/dashboard")}
          >
            Open dashboard
            <ArrowRight className="size-4" />
          </Button>
        </>
      ) : (
        <>
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2.5 text-left text-xs text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-accent-base" />
            You&apos;ll join as a <span className="font-medium text-foreground">Member</span>{" "}
            (read-only) until an Admin grants you access.
          </div>

          {needsEmail && (
            <div className="mt-5 space-y-2 text-left">
              <Label htmlFor="join-email">Your email</Label>
              <Input
                id="join-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
              />
            </div>
          )}

          <Button
            size="lg"
            className="mt-6 w-full"
            onClick={join}
            disabled={!canJoin}
          >
            <Users className="size-4" />
            Join {org.name}
          </Button>
        </>
      )}
    </div>
  );
}
