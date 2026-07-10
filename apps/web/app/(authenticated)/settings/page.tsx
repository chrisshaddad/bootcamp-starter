import { ChangePasswordCard } from '@/components/change-password-card';
import { ENTER, enterStyle } from '@/lib/enter-animation';

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
