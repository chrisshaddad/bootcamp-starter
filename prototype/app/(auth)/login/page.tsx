"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { DEMO_USER } from "@/lib/seed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const { dispatch } = useStore();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const valid = EMAIL_RE.test(email);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
  };

  const continueAsDemo = () => {
    dispatch({ type: "SIGN_IN", email: DEMO_USER.email });
    router.push("/dashboard");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-7 ring-1 ring-foreground/5">
      <div className="space-y-1.5">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === "login"
            ? "Sign in to your Margin workspace."
            : "Start tracking your profitability in minutes."}
        </p>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@business.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && !valid}
            autoComplete="email"
          />
          {touched && !valid && (
            <p className="text-xs text-error">Enter a valid email address.</p>
          )}
        </div>
        <Button type="submit" size="lg" className="w-full">
          <Mail className="size-4" />
          Send magic link
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          No password needed — we&apos;ll email you a secure sign-in link.
        </p>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={continueAsDemo}
      >
        <Sparkles className="size-4 text-primary-300" />
        Explore the demo workspace
      </Button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "login" ? "New to Margin?" : "Already have an account?"}{" "}
        <button
          type="button"
          className="font-medium text-primary-300 hover:underline"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Create an account" : "Log in"}
        </button>
      </p>
    </div>
  );
}
