import { ShieldX } from 'lucide-react';

interface ForbiddenPageProps {
  message?: string;
}

export function ForbiddenPage({
  message = "You don't have permission to access this page.",
}: ForbiddenPageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="mb-4 h-16 w-16 text-destructive" />
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="max-w-md text-center text-gray-500">{message}</p>
    </div>
  );
}
