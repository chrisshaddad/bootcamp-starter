import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  color,
  className,
}: {
  name: string;
  color: string;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-8", className)}>
      <AvatarFallback
        style={{ backgroundColor: `${color}22`, color }}
        className="text-xs font-semibold"
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
