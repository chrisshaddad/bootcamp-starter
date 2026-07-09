import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[26px] font-medium text-text-1">
          Settings
        </h1>
        <p className="mt-0.5 text-[13px] text-text-2">
          Manage your account and organization settings
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg font-medium text-text-1">
            <Settings className="h-5 w-5 text-text-3" />
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-75 flex-col items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sunken">
              <Settings className="h-8 w-8 text-text-3" />
            </div>
            <h3 className="font-display text-lg font-medium text-text-1">
              Coming Soon
            </h3>
            <p className="mt-1 text-[13px] text-text-2">
              Settings features are being developed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
