'use client';

import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordFieldsForm } from '@/components/password-fields-form';

export function ChangePasswordCard() {
  const handleSuccess = () => {
    toast.success('Password updated successfully.');
  };

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <KeyRound className="h-5 w-5 text-gray-500" />
          Change Password
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-w-md">
          <PasswordFieldsForm
            passwordLabel="New Password"
            passwordPlaceholder="Enter a new password"
            submitLabel="Update Password"
            submittingLabel="Updating..."
            resetOnSuccess
            onSuccess={handleSuccess}
          />
        </div>
      </CardContent>
    </Card>
  );
}
