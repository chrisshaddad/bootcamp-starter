import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Auto-generated docstring */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
