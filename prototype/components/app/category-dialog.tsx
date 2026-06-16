"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import type { ExpenseCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const PALETTE = [
  "#7C4DFF",
  "#22D3EE",
  "#E879F9",
  "#34D39A",
  "#FBBF24",
  "#F4506A",
  "#936BFF",
  "#4FDDF2",
];

export function CategoryDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: ExpenseCategory | null;
}) {
  const { dispatch } = useStore();
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [recurring, setRecurring] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setColor(category?.color ?? PALETTE[0]);
    setRecurring(category?.recurring ?? false);
  }, [open, category]);

  const valid = name.trim() !== "";

  const save = () => {
    if (!valid) return;
    if (category) {
      dispatch({
        type: "UPDATE_CATEGORY",
        id: category.id,
        patch: { name: name.trim(), color, recurring },
      });
      toast.success(`${name.trim()} updated`);
    } else {
      dispatch({
        type: "ADD_CATEGORY",
        category: { name: name.trim(), color, recurring },
      });
      toast.success(`${name.trim()} added`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "Add category"}</DialogTitle>
          <DialogDescription>
            Group your expenses into buckets like Rent, Payroll, or Marketing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Marketing"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ background: c }}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-popover transition-all",
                    color === c && "ring-2 ring-foreground",
                  )}
                  aria-label={`Color ${c}`}
                >
                  {color === c && <Check className="size-3.5 text-background" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2.5">
            <div>
              <Label htmlFor="cat-recurring" className="cursor-pointer">
                Recurring
              </Label>
              <p className="text-xs text-muted-foreground">
                Repeats on a regular cadence (e.g. monthly rent).
              </p>
            </div>
            <Switch
              id="cat-recurring"
              checked={recurring}
              onCheckedChange={setRecurring}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!valid}>
            {category ? "Save changes" : "Add category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
