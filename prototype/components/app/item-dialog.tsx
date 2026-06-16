"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import type { Item, ItemType } from "@/lib/types";
import { formatCurrencyCents, formatPercent } from "@/lib/format";
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

export function ItemDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
}) {
  const { dispatch } = useStore();
  const [name, setName] = useState("");
  const [type, setType] = useState<ItemType>("PRODUCT");
  const [price, setPrice] = useState("");
  const [unitCost, setUnitCost] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? "");
    setType(item?.type ?? "PRODUCT");
    setPrice(item ? String(item.price) : "");
    setUnitCost(item ? String(item.unitCost) : "");
  }, [open, item]);

  const priceN = Number(price);
  const costN = Number(unitCost);
  const valid =
    name.trim() !== "" &&
    price !== "" &&
    unitCost !== "" &&
    !Number.isNaN(priceN) &&
    !Number.isNaN(costN) &&
    priceN >= 0 &&
    costN >= 0;
  const cm = priceN - costN;
  const marginPct = priceN > 0 ? cm / priceN : 0;

  const save = () => {
    if (!valid) return;
    if (item) {
      dispatch({
        type: "UPDATE_ITEM",
        id: item.id,
        patch: { name: name.trim(), type, price: priceN, unitCost: costN },
      });
      toast.success(`${name.trim()} updated`);
    } else {
      dispatch({
        type: "ADD_ITEM",
        item: { name: name.trim(), type, price: priceN, unitCost: costN },
      });
      toast.success(`${name.trim()} added`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit item" : "Add item"}</DialogTitle>
          <DialogDescription>
            Products and services you sell. Margins are computed from price and
            unit cost.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item-name">Name</Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Road Bike"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-type">Type</Label>
            <FormSelect
              id="item-type"
              value={type}
              onValueChange={setType}
              options={[
                { value: "PRODUCT", label: "Product" },
                { value: "SERVICE", label: "Service" },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="item-price">Price (USD)</Label>
              <Input
                id="item-price"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="1800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-cost">Unit cost (USD)</Label>
              <Input
                id="item-cost"
                inputMode="decimal"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="1250"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2.5">
            <span className="text-sm text-muted-foreground">
              Contribution margin
            </span>
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {valid ? `${formatCurrencyCents(cm)} · ${formatPercent(marginPct, 0)}` : "—"}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!valid}>
            {item ? "Save changes" : "Add item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
