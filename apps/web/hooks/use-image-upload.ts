'use client';

import { useCallback, useState } from 'react';
import { apiPostFormData } from '@/lib/api';
import type { ImageUploadResponse } from '@repo/contracts';

const ENDPOINT = '/uploads/image';

/**
 * Uploads a single image file to the API (which forwards it to Cloudinary)
 * and resolves to the resulting hosted URL. No SWR cache here - this is a
 * one-off action, not a resource to list/read.
 */
export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(async (file: File): Promise<string> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiPostFormData<ImageUploadResponse>(
        ENDPOINT,
        formData,
      );
      return res.url;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { upload, isUploading };
}
