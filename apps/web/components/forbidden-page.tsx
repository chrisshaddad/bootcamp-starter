import { ShieldX } from 'lucide-react';

interface ForbiddenPageProps {
  /** Optional override for the explanatory line. */
  message?: string;
}

const DEFAULT_MESSAGE =
  "You don't have permission to access this page. Please contact your administrator if you believe this is a mistake.";

/**
 * Shared "Access Denied" state for role-gated pages. Rendered by `RequireRole`
 * (and directly by pages that gate inline).
 */
export function ForbiddenPage({
  message = DEFAULT_MESSAGE,
}: ForbiddenPageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="mb-4 h-16 w-16 text-error/70" />
      <h1 className="mb-2 text-2xl font-bold text-foreground">Access Denied</h1>
      <p className="max-w-md text-center text-muted-foreground">{message}</p>
    </div>
  );
}
