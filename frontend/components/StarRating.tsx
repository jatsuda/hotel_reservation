"use client";

import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<string, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

// Displays a 1-5 star rating. Pass onChange to make it an interactive
// picker (used by ReviewFormModal); omit it for a read-only display (used
// everywhere reviews are shown).
export default function StarRating({ value, onChange, size = "md", className = "" }: StarRatingProps) {
  const interactive = Boolean(onChange);
  const sizeClass = SIZE_CLASSES[size];
  const rounded = Math.round(value);

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((n) =>
        interactive ? (
          <button
            key={n}
            type="button"
            onClick={() => onChange?.(n)}
            className="cursor-pointer"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star className={`${sizeClass} ${n <= rounded ? "fill-primary text-primary" : "text-secondary"}`} />
          </button>
        ) : (
          <Star
            key={n}
            className={`${sizeClass} ${n <= rounded ? "fill-primary text-primary" : "text-secondary"}`}
          />
        )
      )}
    </div>
  );
}
