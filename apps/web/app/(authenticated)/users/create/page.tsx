'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, type CreateUserBody } from '@repo/contracts/users';
import Link from 'next/link';
import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { apiPost } from '../../../../lib/api';

type ImportedStudent = CreateUserBody & {
  role: 'MEMBER';
};

type CreateUserResponse = {
  message?: string;
};

const defaultFormValues: CreateUserBody = {
  name: '',
  email: '',
  role: 'MEMBER',
  dateOfBirth: '',
  className: '',
  sectionName: '',
};

function escapeCsvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csvContent = rows
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\n');

  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let currentValue = '';
  let isInsideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && isInsideQuotes && nextCharacter === '"') {
      currentValue += '"';
      index += 1;
    } else if (character === '"') {
      isInsideQuotes = !isInsideQuotes;
    } else if (character === ',' && !isInsideQuotes) {
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += character;
    }
  }

  values.push(currentValue.trim());

  return values;
}

function formatZodErrors(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'issues' in error &&
    Array.isArray(error.issues)
  ) {
    return error.issues
      .map((issue) => {
        const path =
          'path' in issue && Array.isArray(issue.path)
            ? issue.path.join('.')
            : '';

        const message =
          'message' in issue && typeof issue.message === 'string'
            ? issue.message
            : 'Invalid value';

        return path ? `${path}: ${message}` : message;
      })
      .join(', ');
  }

  return 'Invalid row';
}

function normalizeCreateUserPayload(values: CreateUserBody): CreateUserBody {
  const payload: CreateUserBody = {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    role: values.role,
  };

  if (values.role === 'MEMBER') {
    payload.dateOfBirth = values.dateOfBirth?.trim() || undefined;
    payload.className = values.className?.trim();
    payload.sectionName = values.sectionName?.trim();
  }

  return payload;
}

export default function CreateUserPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [bulkSuccessMessage, setBulkSuccessMessage] = useState('');
  const [bulkErrorMessage, setBulkErrorMessage] = useState('');

  const [selectedFileName, setSelectedFileName] = useState('');
  const [importedStudents, setImportedStudents] = useState<ImportedStudent[]>(
    [],
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateUserBody>({
    resolver: zodResolver(createUserSchema),
    defaultValues: defaultFormValues,
  });

  const role = watch('role');
  const isStudent = role === 'MEMBER';
  const isTeacher = role === 'ORG_ADMIN';

  const roleField = register('role');

  async function onSubmit(values: CreateUserBody) {
    setIsSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const payload = normalizeCreateUserPayload(values);

      const data = await apiPost<CreateUserResponse>('/users', payload);

      setSuccessMessage(
        data.message ||
          'User created successfully. They can now log in using magic link.',
      );

      reset(defaultFormValues);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Something went wrong',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDownloadTemplate() {
    downloadCsv('students-import-template.csv', [
      ['Full Name', 'Email', 'Date of Birth', 'Class / Grade', 'Section'],
      ['Example Student', 'student@example.com', '2010-01-01', 'Grade 9', 'A'],
    ]);
  }

  function resetFileSelection() {
    setSelectedFileName('');
    setImportedStudents([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setBulkSuccessMessage('');
    setBulkErrorMessage('');
    setImportedStudents([]);

    if (!file) {
      setSelectedFileName('');
      return;
    }

    setSelectedFileName(file.name);

    const reader = new FileReader();

    reader.onload = () => {
      const text = String(reader.result || '');

      const rows = text
        .split(/\r?\n/)
        .map((row) => row.trim())
        .filter(Boolean);

      if (rows.length <= 1) {
        setBulkErrorMessage('The uploaded file does not contain student rows.');
        return;
      }

      const students: ImportedStudent[] = [];
      const failures: string[] = [];

      rows.slice(1).forEach((row, index) => {
        const rowNumber = index + 2;
        const columns = parseCsvLine(row);

        const parsed = createUserSchema.safeParse({
          name: columns[0] || '',
          email: columns[1] || '',
          role: 'MEMBER',
          dateOfBirth: columns[2] || undefined,
          className: columns[3] || '',
          sectionName: columns[4] || '',
        });

        if (!parsed.success) {
          failures.push(`Row ${rowNumber}: ${formatZodErrors(parsed.error)}`);
          return;
        }

        students.push(
          normalizeCreateUserPayload(parsed.data) as ImportedStudent,
        );
      });

      if (students.length === 0) {
        setBulkErrorMessage(
          failures.length > 0
            ? failures.join('\n')
            : 'No valid students were found in the file.',
        );
        return;
      }

      setImportedStudents(students);
      setBulkSuccessMessage(
        `${students.length} student(s) loaded from file. Review below, then click Import.`,
      );

      if (failures.length > 0) {
        setBulkErrorMessage(failures.join('\n'));
      }
    };

    reader.onerror = () => {
      setBulkErrorMessage('Could not read the uploaded file.');
    };

    reader.readAsText(file);
  }

  async function handleImportStudents() {
    if (importedStudents.length === 0) {
      setBulkErrorMessage('Please upload a valid student file first.');
      return;
    }

    setIsImporting(true);
    setBulkSuccessMessage('');
    setBulkErrorMessage('');

    let successCount = 0;
    const failures: string[] = [];
    const stillPending: ImportedStudent[] = [];

    for (const student of importedStudents) {
      const studentLabel = student.email || student.name || 'Unknown student';
      const parsed = createUserSchema.safeParse(student);

      if (!parsed.success) {
        failures.push(`${studentLabel}: ${formatZodErrors(parsed.error)}`);
        stillPending.push(student);
        continue;
      }

      try {
        await apiPost<CreateUserResponse>(
          '/users',
          normalizeCreateUserPayload(parsed.data),
        );

        successCount += 1;
      } catch (error) {
        failures.push(
          `${studentLabel}: ${
            error instanceof Error ? error.message : 'Failed to import student'
          }`,
        );
        stillPending.push(student);
      }
    }

    if (successCount > 0) {
      setBulkSuccessMessage(
        `${successCount} student(s) imported successfully.`,
      );
    }

    if (failures.length > 0) {
      setBulkErrorMessage(failures.join('\n'));
    }

    setImportedStudents(stillPending);

    if (stillPending.length === 0) {
      resetFileSelection();
    }

    setIsImporting(false);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create User</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create users manually or import students using an Excel-compatible CSV
          sheet.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Manual User Creation
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Students and teachers will log in using magic link.
          </p>
        </div>

        {successMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <input
            type="text"
            {...register('name')}
            placeholder="Enter full name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
          />
          {errors.name?.message && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            {...register('email')}
            placeholder="Enter email address"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
          />
          {errors.email?.message && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Role
          </label>
          <select
            {...roleField}
            onChange={(event) => {
              roleField.onChange(event);
              setValue('dateOfBirth', '');
              setValue('className', '');
              setValue('sectionName', '');
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
          >
            <option value="MEMBER">Student / User</option>
            <option value="ORG_ADMIN">Teacher / Admin</option>
          </select>
          {errors.role?.message && (
            <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>
          )}
        </div>

        {isStudent && (
          <div className="space-y-5 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Student Information
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Student ID/code will be generated automatically.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Date of Birth
              </label>
              <input
                type="date"
                {...register('dateOfBirth')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
              {errors.dateOfBirth?.message && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.dateOfBirth.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Class / Grade
              </label>
              <input
                type="text"
                {...register('className')}
                placeholder="Example: Grade 9"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
              {errors.className?.message && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.className.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Section
              </label>
              <input
                type="text"
                {...register('sectionName')}
                placeholder="Example: A"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
              {errors.sectionName?.message && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.sectionName.message}
                </p>
              )}
            </div>
          </div>
        )}

        {isTeacher && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Teacher Information
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Teacher ID will be generated automatically after creation.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Creating...' : 'Create User'}
          </button>

          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>

      <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Bulk Student Import
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Download a CSV template, fill in student information, then upload it
            to import students.
          </p>
        </div>

        {bulkSuccessMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {bulkSuccessMessage}
          </div>
        )}

        {bulkErrorMessage && (
          <div className="whitespace-pre-line rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {bulkErrorMessage}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900">
              1. Download Template
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get the CSV file format for student import.
            </p>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Download Template
            </button>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900">
              2. Upload CSV File
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Upload the completed student sheet.
            </p>

            <label
              htmlFor="students-file"
              className="mt-4 block cursor-pointer rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-600 hover:bg-gray-50"
            >
              {selectedFileName || 'Click to upload CSV file'}
            </label>

            <input
              id="students-file"
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={handleImportStudents}
              disabled={importedStudents.length === 0 || isImporting}
              className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isImporting ? 'Importing...' : 'Import Students'}
            </button>
          </div>
        </div>

        {importedStudents.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    Full Name
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    Email
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    DOB
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    Class
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    Section
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {importedStudents.map((student, index) => (
                  <tr key={`${student.email || student.name}-${index}`}>
                    <td className="px-3 py-2 text-gray-900">
                      {student.name || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-900">
                      {student.email || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-900">
                      {student.dateOfBirth || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-900">
                      {student.className || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-900">
                      {student.sectionName || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
