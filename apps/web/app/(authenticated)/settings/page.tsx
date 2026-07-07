import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and organization settings
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Settings className="h-5 w-5 text-muted-foreground" />
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-75 flex-col items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Settings className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">Coming Soon</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Settings features are being developed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
