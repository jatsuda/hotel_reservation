"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

interface ImagePlaceholderProps {
  label: string;
  note?: string;
  aspect?: string; // e.g. "aspect-video", "aspect-square"
  className?: string;
  src?: string; // real image path/URL - if provided (and loads successfully), replaces the placeholder
  alt?: string; // defaults to `label` if omitted
  // When true, the component stretches to fill its (relatively-positioned,
  // explicitly sized) parent instead of sizing itself from `aspect`.
  fill?: boolean;
}

/**
 * Renders a real photo when `src` is given, or a styled placeholder
 * otherwise (including if the image fails to load - e.g. the file hasn't
 * been added yet). This means every image slot can be wired to a real
 * `imageUrl` field as soon as one exists, without breaking pages that
 * don't have a photo yet.
 *
 * Every usage that still shows the placeholder should be paired with a code
 * comment describing what image to add and its recommended size - see
 * individual pages for examples.
 */
export default function ImagePlaceholder({
  label,
  note,
  aspect = "aspect-video",
  className = "",
  src,
  alt,
  fill = false,
}: ImagePlaceholderProps) {
  const [failed, setFailed] = useState(false);
  // `fill` mode: absolutely fill the parent. Otherwise: take the width of the
  // parent and the height from the aspect-ratio class.
  const box = fill ? "absolute inset-0 h-full w-full" : `relative ${aspect} w-full`;

  if (src && !failed) {
    return (
      <div className={`${box} overflow-hidden rounded-card ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || label}
          loading="lazy"
          // Absolutely positioned on purpose: a photo's own pixel size must never
          // be able to stretch its frame (an aspect-ratio box grows to fit its
          // content otherwise, which is what made big photos spill out of the
          // gallery). object-cover then crops the photo to the frame.
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex ${box} flex-col items-center justify-center gap-2 rounded-card border border-dashed border-secondary bg-secondary/20 text-center ${className}`}
    >
      <ImageIcon className="h-8 w-8 text-muted" strokeWidth={1.5} />
      <p className="text-sm font-medium text-text">{label}</p>
      {note && <p className="max-w-xs text-xs text-muted">{note}</p>}
    </div>
  );
}
