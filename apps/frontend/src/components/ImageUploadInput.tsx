'use client';

/**
 * ImageUploadInput
 *
 * A URL text-field augmented with a "Upload file" button.
 * When the user picks a local file it is POST-ed to /uploads/image and the
 * returned URL is written back to the value via `onChange`.
 * The URL field stays editable so admins can also paste a remote URL directly.
 *
 * Accepted formats: JPEG, PNG, GIF, WebP (mirrors the backend allowlist).
 * Max size enforced server-side (5 MB).
 */

import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';

interface UploadResponse {
  url: string;
}

interface Props {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  /** Extra class names applied to the wrapper div */
  className?: string;
}

export function ImageUploadInput({ value, onChange, placeholder, className = '' }: Props) {
  const { t } = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const form = new FormData();
      form.append('image', file);
      const res = await api.upload<UploadResponse>('/uploads/image', form);
      onChange(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      // Reset so the same file can be re-selected if needed
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => { setError(''); onChange(e.target.value); }}
          placeholder={placeholder ?? 'https://… or upload a file →'}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="shrink-0 gap-1.5"
        >
          {uploading ? (
            <>
              <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
              {t('admin.imageUpload.uploading')}
            </>
          ) : (
            <>
              {/* Upload icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {t('admin.imageUpload.upload')}
            </>
          )}
        </Button>

        {/* Hidden native file picker */}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
