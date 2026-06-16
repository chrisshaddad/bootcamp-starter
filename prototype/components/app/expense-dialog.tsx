"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import type { Cadence, Expense } from "@/lib/types";
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
import { FormSelect } from "@/components/app/form-select";

const CADENCE_OPTIONS: { value: Cadence; label: string }[] = [
  { value: "ONE_OFF", label: "One-off" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

const today = () => new Date().toISOString().slice(0, 10);

export function ExpenseDialog({
  open,
  onOpenChange,
  expense,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
}) {
  const { dispatch, orgData } = useStore();
  const categories = orgData?.categories ?? [];

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(today());
  const [cadence, setCadence] = useState<Cadence>("ONE_OFF");

  useEffect(() => {
    if (!open) return;
    setDescription(expense?.description ?? "");
    setAmount(expense ? String(expense.amount) : "");
    setCategoryId(expense?.categoryId ?? categories[0]?.id ?? "");
    setDate(expense?.date ?? today());
    setCadence(expense?.cadence ?? "ONE_OFF");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense]);

  const amountN = Number(amount);
  const valid =
    categoryId !== "" && amount !== "" && !Number.isNaN(amountN) && amountN > 0;

  const save = () => {
    if (!valid) return;
    const payload = {
      categoryId,
      description: description.trim() || "Expense",
      amount: amountN,
      date,
      cadence,
    };
    if (expense) {
      dispatch({ type: "UPDATE_EXPENSE", id: expense.id, patch: payload });
      toast.success("Expense updated");
    } else {
      dispatch({ type: "ADD_EXPENSE", expense: payload });
      toast.success("Expense added");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{expense ? "Edit expense" : "Add expense"}</DialogTitle>
          <DialogDescription>
            Record a cost and classify it under a category.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exp-desc">Description</Label>
            <Input
              id="exp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="June rent"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="exp-amount">Amount (USD)</Label>
              <Input
                id="exp-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="2200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-date">Date</Label>
              <Input
                id="exp-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exp-cat">Category</Label>
            <FormSelect
              id="exp-cat"
              value={categoryId}
              onValueChange={setCategoryId}
              placeholder="Select a category"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exp-cadence">Recurrence</Label>
            <FormSelect
              id="exp-cadence"
              value={cadence}
              onValueChange={setCadence}
              options={CADENCE_OPTIONS}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!valid}>
            {expense ? "Save changes" : "Add expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
