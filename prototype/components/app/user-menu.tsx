"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, LogOut, RotateCcw, User as UserIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { UserAvatar } from "./user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const router = useRouter();
  const { currentUser, currentOrg, dispatch } = useStore();
  if (!currentUser) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 pr-2 outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring">
        <UserAvatar name={currentUser.name} color={currentUser.avatarColor} />
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-tight text-foreground">
            {currentUser.name}
          </span>
          <span className="block text-xs leading-tight text-muted-foreground">
            {currentOrg?.name ?? "No organization"}
          </span>
        </span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="text-sm font-medium">{currentUser.name}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {currentUser.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <UserIcon className="size-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            dispatch({ type: "RESET" });
            toast.success("Demo data reset to the bike-shop sample.");
            router.push("/dashboard");
          }}
        >
          <RotateCcw className="size-4" />
          Reset demo data
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            dispatch({ type: "SIGN_OUT" });
            router.push("/");
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
