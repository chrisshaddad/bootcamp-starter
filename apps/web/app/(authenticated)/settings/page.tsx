import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your account and organization settings
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2 text-lg font-semibold">
            <Settings className="text-muted-foreground h-5 w-5" />
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-75 flex-col items-center justify-center">
          <div className="text-center">
            <div className="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <Settings className="text-muted-foreground h-8 w-8" />
            </div>
            <h3 className="text-foreground text-lg font-medium">Coming Soon</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Settings features are being developed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
