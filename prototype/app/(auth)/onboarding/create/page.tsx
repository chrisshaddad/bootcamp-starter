"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CreateOrgPage() {
  const router = useRouter();
  const { dispatch, currentUser, hydrated } = useStore();
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("");

  useEffect(() => {
    if (hydrated && !currentUser) router.replace("/login");
  }, [hydrated, currentUser, router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    dispatch({
      type: "CREATE_ORG",
      name: name.trim(),
      businessType: businessType.trim() || undefined,
    });
    router.push("/dashboard");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-7 ring-1 ring-foreground/5">
      <button
        type="button"
        onClick={() => router.push("/onboarding")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back
      </button>

      <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary-300">
        <Building2 className="size-5" />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-foreground">
        Create your organization
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        We&apos;ll set you up as the Admin and load a sample dataset so you can
        explore right away.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="org-name">Organization name</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cog & Sprocket Cycles"
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="biz-type">
            Business type{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="biz-type"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            placeholder="Bike shop"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">Currency</span>
          <span className="font-medium text-foreground">USD ($)</span>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={!name.trim()}>
          Create organization
        </Button>
      </form>
    </div>
  );
}
