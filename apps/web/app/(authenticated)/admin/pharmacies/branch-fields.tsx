'use client';

import type { UseFormRegisterReturn } from 'react-hook-form';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';

// The logical fields of a branch form. Each host form maps these to its own
// react-hook-form field names via the `register` adapter, so the same inputs
// serve the "new pharmacy" dialog (flat field names) and the branch add/edit
// dialogs (a dedicated branch form).
export type BranchFieldKey =
  | 'name'
  | 'phone'
  | 'address'
  | 'latitude'
  | 'longitude';

export interface BranchFieldErrors {
  name?: string;
  phone?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}

// Shared branch form inputs: name, phone (optional), address, and manual
// latitude / longitude entry. Coordinates are plain text inputs (validated and
// coerced by the host form's schema) so there's no external map dependency.
export function BranchFields({
  register,
  errors,
}: {
  register: (field: BranchFieldKey) => UseFormRegisterReturn;
  errors: BranchFieldErrors;
}) {
  return (
    <>
      <Field label="Branch name" error={errors.name}>
        <Input {...register('name')} placeholder="Downtown Branch" />
      </Field>
      <Field label="Phone (optional)" error={errors.phone}>
        <Input {...register('phone')} placeholder="+961 1 234 567" />
      </Field>
      <Field label="Address" error={errors.address}>
        <Input {...register('address')} placeholder="123 Main St, City" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude" error={errors.latitude}>
          <div className="relative">
            <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              {...register('latitude')}
              inputMode="decimal"
              placeholder="33.8938"
              className="pl-9"
            />
          </div>
        </Field>
        <Field label="Longitude" error={errors.longitude}>
          <Input
            {...register('longitude')}
            inputMode="decimal"
            placeholder="35.5018"
          />
        </Field>
      </div>
    </>
  );
}
