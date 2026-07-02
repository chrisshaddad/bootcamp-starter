import { ChangePasswordCard } from '@/components/change-password-card';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account and organization settings
        </p>
      </div>

      <ChangePasswordCard />
    </div>
  );
}
