"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Link2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEMO_ORG_ID } from "@/lib/seed";

export default function OnboardingPage() {
  const router = useRouter();
  const [link, setLink] = useState("");

  const goJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = link.trim();
    if (!raw) return;
    const token = raw.includes("/join/")
      ? (raw.split("/join/").pop() ?? "").split(/[?#]/)[0]
      : raw;
    if (token) router.push(`/join/${token}`);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Set up your workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          Create a new organization, or join one you&apos;ve been invited to.
        </p>
      </div>

      <Link
        href="/onboarding/create"
        className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary-base/50"
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-300">
          <Building2 className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">Create an organization</p>
          <p className="text-sm text-muted-foreground">
            Start fresh — you&apos;ll be the Admin and can invite your team.
          </p>
        </div>
        <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </Link>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-base/10 text-accent-base">
            <Users className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">Join an organization</p>
            <p className="text-sm text-muted-foreground">
              Paste your invite link to join as a Member.
            </p>
          </div>
        </div>
        <form onSubmit={goJoin} className="mt-4 flex items-center gap-2">
          <Input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://…/join/your-invite-token"
            className="font-mono text-xs"
          />
          <Button type="submit" variant="secondary">
            Join
          </Button>
        </form>
        <button
          type="button"
          onClick={() => router.push(`/join/${DEMO_ORG_ID}`)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Link2 className="size-3.5" />
          Try a sample invite link
        </button>
      </div>
    </div>
  );
}
