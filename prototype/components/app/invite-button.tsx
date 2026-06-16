"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function InviteButton({
  size = "default",
  variant = "default",
}: {
  size?: "default" | "sm" | "lg";
  variant?: "default" | "secondary" | "outline";
}) {
  const { currentOrg, isAdmin } = useStore();
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  if (!isAdmin || !currentOrg) return null;
  const link = `${origin}/join/${currentOrg.id}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Invite link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — select and copy manually.");
    }
  };

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button size={size} variant={variant}>
            <UserPlus className="size-4" />
            Invite
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to {currentOrg.name}</DialogTitle>
          <DialogDescription>
            Anyone with this link joins as a Member. You can assign them a role
            afterward from the Members page.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input readOnly value={link} className="font-mono text-xs" />
          <Button type="button" variant="secondary" size="icon" onClick={copy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link2 className="size-3.5" />
          New members are read-only until an Admin grants access.
        </p>
      </DialogContent>
    </Dialog>
  );
}
