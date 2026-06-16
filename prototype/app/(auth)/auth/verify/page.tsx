"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, MailCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const { dispatch, state } = useStore();
  const [loading, setLoading] = useState(false);

  const cont = () => {
    setLoading(true);
    const existing = state.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    const membership = existing
      ? state.members.find((m) => m.userId === existing.id)
      : undefined;
    dispatch({ type: "SIGN_IN", email });
    router.push(membership ? "/dashboard" : "/onboarding");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-7 text-center ring-1 ring-foreground/5">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary-300">
        <MailCheck className="size-6" />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-foreground">
        Check your inbox
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We sent a secure sign-in link to{" "}
        <span className="font-medium text-foreground">
          {email || "your email"}
        </span>
        . Click it to continue.
      </p>

      <div className="mt-6 rounded-lg border border-dashed border-border bg-background/40 px-4 py-3 text-left">
        <p className="text-xs text-muted-foreground">
          This is a prototype — no real email is sent. Use the button below to
          simulate clicking the link.
        </p>
      </div>

      <Button
        size="lg"
        className="mt-6 w-full"
        onClick={cont}
        disabled={loading || !email}
      >
        Continue
        <ArrowRight className="size-4" />
      </Button>

      <button
        type="button"
        className="mt-4 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => router.push("/login")}
      >
        Use a different email
      </button>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-border bg-card p-7 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
