import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
    </div>
  );
}
