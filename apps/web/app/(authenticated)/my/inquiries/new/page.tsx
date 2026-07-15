'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  MessageSquare,
  Pill,
  Search,
  Send,
} from 'lucide-react';
import {
  clientInquiryCreateRequestSchema,
  type ClientInquiryCreateRequest,
} from '@repo/contracts';
import { useDirectoryBranch } from '@/hooks/use-directory';
import { useMyInquiryActions } from '@/hooks/use-my-inquiries';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ENTER, enterStyle } from '@/lib/enter-animation';

function BackLink() {
  return (
    <div className={ENTER} style={enterStyle(0)}>
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-8">
        <Link href="/my/inquiries">
          <ArrowLeft className="h-4 w-4" />
          My inquiries
        </Link>
      </Button>
    </div>
  );
}

// Reached without a pharmacy in the query (e.g. opened directly): steer the
// client to a starting point instead of a dead form.
function NoBranch() {
  return (
    <Card className="py-0">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-hover">
          <MessageSquare className="h-7 w-7" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-gray-900">
          Pick a pharmacy to ask
        </h3>
        <p className="mb-4 max-w-md text-sm text-gray-500">
          Find a medicine and choose a nearby pharmacy that stocks it, or browse
          the pharmacy directory — then hit “Ask this pharmacy”.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/find">
              <Search className="h-4 w-4" />
              Find a medicine
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/pharmacies">
              <Building2 className="h-4 w-4" />
              Browse pharmacies
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NewInquiryForm() {
  const router = useRouter();
  const params = useSearchParams();
  const branchId = params.get('branchId') ?? undefined;
  const medicineIdParam = params.get('medicineId') ?? '';

  const { branch, isLoading, error } = useDirectoryBranch(branchId);
  const { createInquiry } = useMyInquiryActions();

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ClientInquiryCreateRequest>({
    resolver: zodResolver(clientInquiryCreateRequestSchema),
    defaultValues: {
      branchId: branchId ?? '',
      medicineId: medicineIdParam,
      message: '',
    },
  });

  // A stale `?medicineId=` may name a medicine this branch doesn't stock. Once
  // the branch loads, clear it if it isn't one of the options, so the picker and
  // validation reflect reality (and no mismatched id can be submitted).
  const medicineId = watch('medicineId');
  useEffect(() => {
    if (
      branch &&
      medicineId &&
      !branch.medicines.some((m) => m.medicineId === medicineId)
    ) {
      setValue('medicineId', '');
    }
  }, [branch, medicineId, setValue]);

  if (!branchId) return <NoBranch />;

  if (error) {
    return (
      <Card className="py-0">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <AlertTriangle className="mb-4 h-12 w-12 text-error" />
          <h3 className="mb-1 text-lg font-semibold text-gray-900">
            Couldn&apos;t load that pharmacy
          </h3>
          <p className="max-w-md text-center text-sm text-gray-500">
            Try picking a pharmacy again from the directory.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !branch) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  const medicines = branch.medicines;
  const noStock = medicines.length === 0;

  const onSubmit = async (data: ClientInquiryCreateRequest) => {
    try {
      // branchId is fixed from the URL; take it from there, not the form state.
      const created = await createInquiry({ ...data, branchId });
      toast.success('Your question was sent.');
      router.push(`/my/inquiries/${created.id}`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to send your question.',
      );
    }
  };

  return (
    <Card className={ENTER} style={enterStyle(70)}>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Pharmacy context */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-hover">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900">
                {branch.pharmacyName}
              </p>
              <p className="truncate text-sm text-gray-500">
                {branch.branchName} · {branch.address}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Pill className="h-4 w-4 text-gray-400" />
              Medicine
            </label>
            {noStock ? (
              <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning-dark">
                This branch has no medicines in stock to ask about right now.
              </p>
            ) : (
              <Controller
                control={control}
                name="medicineId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a medicine" />
                    </SelectTrigger>
                    <SelectContent>
                      {medicines.map((medicine) => (
                        <SelectItem
                          key={medicine.medicineId}
                          value={medicine.medicineId}
                        >
                          {medicine.brandName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
            {errors.medicineId ? (
              <p className="text-xs text-error">Please choose a medicine.</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Your question
            </label>
            <textarea
              {...register('message')}
              rows={4}
              maxLength={2000}
              placeholder="e.g. Do you have this in stock? What's the price?"
              disabled={isSubmitting || noStock}
              className="w-full resize-none rounded-[10px] border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-gray-500 focus-visible:border-primary-hover focus-visible:ring-[3px] focus-visible:ring-primary-100 disabled:opacity-50"
            />
            {errors.message ? (
              <p className="text-xs text-error">{errors.message.message}</p>
            ) : null}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || noStock}>
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Sending…' : 'Send question'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function NewInquiryPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BackLink />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <NewInquiryForm />
      </Suspense>
    </div>
  );
}
