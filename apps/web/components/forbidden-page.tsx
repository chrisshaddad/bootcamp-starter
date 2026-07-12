import { ShieldX } from 'lucide-react';

interface ForbiddenPageProps {
  message?: string;
}

/**
 * Shared 403 view. Backend guards are the real enforcement — this is the
 * client-side mirror shown when a user's role can't access a page.
 */
export function ForbiddenPage({
  message = "You don't have permission to access this page.",
}: ForbiddenPageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="h-16 w-16 text-red-400 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
      <p className="text-gray-500 text-center max-w-md">{message}</p>
    </div>
  );
}
