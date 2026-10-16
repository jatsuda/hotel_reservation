"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { uploadImage } from "@/lib/api";
import { useLocale } from "@/lib/locale-context";

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string; // placeholder for the manual URL/path input
  compact?: boolean; // smaller thumbnail, used inside gallery rows
  className?: string;
}

/**
 * Admin image picker: choose a file from the computer (uploaded to the
 * backend, which returns a public URL), or paste an existing URL/path by
 * hand. Shows a thumbnail of whatever is currently set.
 */
export default function ImageUploadField({
  value,
  onChange,
  placeholder,
  compact = false,
  className = "",
}: ImageUploadFieldProps) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setPreviewFailed(false);
      onChange(url);
    } catch {
      setError(t.admin.upload.failed);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = ""; // allow re-selecting the same file
    }
  }

  const thumb = compact ? "h-16 w-24" : "h-24 w-36";

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          className={`relative flex ${thumb} flex-shrink-0 items-center justify-center overflow-hidden rounded-control border border-dashed border-secondary bg-secondary/20`}
        >
          {value && !previewFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setPreviewFailed(true)}
            />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted" strokeWidth={1.5} />
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-control border border-primary px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" />
              )}
              {uploading ? t.admin.upload.uploading : value ? t.admin.upload.replaceFile : t.admin.upload.chooseFile}
            </button>
            {value && !uploading && (
              <button
                type="button"
                onClick={() => {
                  setPreviewFailed(false);
                  onChange("");
                }}
                title={t.admin.upload.remove}
                className="flex h-8 w-8 items-center justify-center rounded-control hover:bg-red-50"
              >
                <X className="h-4 w-4 text-red-500" />
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
          <input
            placeholder={placeholder ?? t.admin.upload.orPath}
            value={value}
            onChange={(e) => {
              setPreviewFailed(false);
              onChange(e.target.value);
            }}
            className="rounded-control border border-secondary bg-background px-3 py-2 text-xs"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
