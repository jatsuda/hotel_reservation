"use client";

import { useRef, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { uploadImage } from "@/lib/api";
import { useLocale } from "@/lib/locale-context";

interface MultiImageUploadProps {
  // Called once per batch with the URLs of every file that uploaded successfully.
  onUploaded: (urls: string[]) => void;
  maxFiles?: number; // per batch
  className?: string;
}

/**
 * Pick (or drag & drop) several photos at once. Each file is uploaded in turn
 * and the resulting URLs are handed back together, so the admin form can add
 * one gallery row per photo.
 */
export default function MultiImageUpload({ onUploaded, maxFiles = 20, className = "" }: MultiImageUploadProps) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | File[] | null) {
    if (busy) return;
    const chosen = Array.from(fileList ?? []);
    if (chosen.length === 0) return; // dialog cancelled - nothing to say

    const images = chosen.filter((f) => f.type.startsWith("image/"));
    const notImages = chosen.length - images.length;
    if (images.length === 0) {
      // Everything picked was a non-image (e.g. a PDF) - tell the user instead of doing nothing.
      setError(t.admin.upload.notImages);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const files = images.slice(0, maxFiles);
    const overLimit = images.length - files.length;

    setError(null);
    setBusy(true);
    setProgress({ done: 0, total: files.length });

    const urls: string[] = [];
    let failed = 0;
    for (const file of files) {
      try {
        urls.push(await uploadImage(file));
      } catch {
        failed++;
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    if (urls.length > 0) onUploaded(urls);

    // Report everything that did not make it, not just upload failures.
    const notes: string[] = [];
    if (notImages > 0) notes.push(t.admin.upload.skippedNotImage.replace("{n}", String(notImages)));
    if (overLimit > 0) notes.push(t.admin.upload.limitReached.replace("{n}", String(maxFiles)));
    if (failed > 0) notes.push(t.admin.upload.someFailed.replace("{n}", String(failed)));
    if (notes.length > 0) setError(notes.join(" "));
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex w-full flex-col items-center justify-center gap-1 rounded-control border border-dashed px-4 py-5 text-center text-xs transition-colors disabled:opacity-70 ${
          dragging ? "border-primary bg-primary/10" : "border-secondary bg-secondary/10 hover:bg-secondary/20"
        }`}
      >
        {busy ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="font-medium text-text">
              {t.admin.upload.uploading} {progress.done}/{progress.total}
            </span>
          </>
        ) : (
          <>
            <UploadCloud className="h-5 w-5 text-primary" />
            <span className="font-medium text-text">{t.admin.upload.chooseMany}</span>
            <span className="text-muted">{t.admin.upload.dropHint}</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/gif"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
