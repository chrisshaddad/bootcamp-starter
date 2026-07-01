'use client';

import { useState, useRef } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';

type ImportedStudent = {
  fullName: string;
  email: string;
  dateOfBirth: string;
  className: string;
  sectionName: string;
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

export default function CreateUserPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'MEMBER',
    dateOfBirth: '',
    className: '',
    sectionName: '',
  });

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

  const isStudent = formData.role === 'MEMBER';
  const isTeacher = formData.role === 'ORG_ADMIN';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        ...(isStudent && {
          dateOfBirth: formData.dateOfBirth || undefined,
          className: formData.className,
          sectionName: formData.sectionName,
        }),
      };

      const response = await fetch('http://localhost:3001/users', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create user');
      }

      setSuccessMessage(
        data.message ||
          'User created successfully. They can now log in using magic link.',
      );

      setFormData({
        name: '',
        email: '',
        role: 'MEMBER',
        dateOfBirth: '',
        className: '',
        sectionName: '',
      });
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

      const students = rows
        .slice(1)
        .map((row) => {
          const columns = parseCsvLine(row);

          return {
            fullName: columns[0] || '',
            email: columns[1] || '',
            dateOfBirth: columns[2] || '',
            className: columns[3] || '',
            sectionName: columns[4] || '',
          };
        })
        .filter((student) => student.fullName || student.email);

      if (students.length === 0) {
        setBulkErrorMessage('No valid students were found in the file.');
        return;
      }

      setImportedStudents(students);
      setBulkSuccessMessage(
        `${students.length} student(s) loaded from file. Review below, then click Import.`,
      );
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
      const studentLabel =
        student.email || student.fullName || 'Unknown student';

      if (
        !student.fullName ||
        !student.email ||
        !student.className ||
        !student.sectionName
      ) {
        failures.push(`${studentLabel}: missing required fields`);
        stillPending.push(student);
        continue;
      }

      try {
        const response = await fetch('http://localhost:3001/users', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: student.fullName,
            email: student.email,
            role: 'MEMBER',
            dateOfBirth: student.dateOfBirth || undefined,
            className: student.className,
            sectionName: student.sectionName,
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          failures.push(
            `${studentLabel}: ${data.message || 'Failed to import student'}`,
          );
          stillPending.push(student);
          continue;
        }

        successCount += 1;
      } catch {
        failures.push(`${studentLabel}: failed to import student`);
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

    // Only keep rows that failed, so re-clicking "Import" doesn't
    // re-create students that already succeeded.
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
        onSubmit={handleSubmit}
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
            value={formData.name}
            onChange={(event) =>
              setFormData({ ...formData, name: event.target.value })
            }
            placeholder="Enter full name"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(event) =>
              setFormData({ ...formData, email: event.target.value })
            }
            placeholder="Enter email address"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Role
          </label>
          <select
            value={formData.role}
            onChange={(event) =>
              setFormData({
                ...formData,
                role: event.target.value,
                dateOfBirth: '',
                className: '',
                sectionName: '',
              })
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
          >
            <option value="MEMBER">Student / User</option>
            <option value="ORG_ADMIN">Teacher / Admin</option>
          </select>
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
                value={formData.dateOfBirth}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    dateOfBirth: event.target.value,
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Class / Grade
              </label>
              <input
                type="text"
                value={formData.className}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    className: event.target.value,
                  })
                }
                placeholder="Example: Grade 9"
                required={isStudent}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Section
              </label>
              <input
                type="text"
                value={formData.sectionName}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    sectionName: event.target.value,
                  })
                }
                placeholder="Example: A"
                required={isStudent}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
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
                  <tr key={`${student.email || student.fullName}-${index}`}>
                    <td className="px-3 py-2 text-gray-900">
                      {student.fullName || '—'}
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
