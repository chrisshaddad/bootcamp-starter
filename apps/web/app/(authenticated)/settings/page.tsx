import { ChangePasswordCard } from '@/components/change-password-card';

// Shared entrance animation, matched to the other admin consoles: sections fade
// + rise in, staggered via an inline animationDelay.
const ENTER = 'animate-in fade-in-0 slide-in-from-bottom-4 duration-500';

function enterStyle(delayMs: number) {
  return {
    animationDelay: `${delayMs}ms`,
    animationFillMode: 'backwards' as const,
  };
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className={ENTER} style={enterStyle(0)}>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account settings
        </p>
      </div>

      <div className={ENTER} style={enterStyle(70)}>
        <ChangePasswordCard />
      </div>
    </div>
  );
}
