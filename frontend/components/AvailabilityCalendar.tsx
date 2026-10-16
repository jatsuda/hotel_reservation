"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "@/lib/locale-context";

interface DateRange {
  checkInDate: string; // ISO yyyy-MM-dd
  checkOutDate: string; // ISO yyyy-MM-dd
}

interface AvailabilityCalendarProps {
  bookedRanges: DateRange[];
  initialMonth?: Date; // defaults to the month of the first booked range, or today
}

const WEEKDAYS: Record<"en" | "th", string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  th: ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"],
};

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isWithinRange(day: Date, range: DateRange) {
  const start = new Date(range.checkInDate);
  const end = new Date(range.checkOutDate);
  return day >= new Date(start.toDateString()) && day <= new Date(end.toDateString());
}

/**
 * Lightweight month calendar (no external date library) that highlights
 * already-booked date ranges in orange/red, matching the reference design.
 * Pass reservations for this room (via GET /api/reservations/room/{id}/upcoming)
 * as `bookedRanges`.
 */
export default function AvailabilityCalendar({ bookedRanges, initialMonth }: AvailabilityCalendarProps) {
  const { t, locale } = useLocale();
  const startingMonth = initialMonth ?? (bookedRanges[0] ? new Date(bookedRanges[0].checkInDate) : new Date());
  const [cursor, setCursor] = useState(new Date(startingMonth.getFullYear(), startingMonth.getMonth(), 1));

  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [cursor]);

  const today = new Date();

  function rangeForDay(day: Date): { range: DateRange; isStart: boolean; isEnd: boolean } | null {
    for (const range of bookedRanges) {
      if (isWithinRange(day, range)) {
        return {
          range,
          isStart: isSameDay(day, new Date(range.checkInDate)),
          isEnd: isSameDay(day, new Date(range.checkOutDate)),
        };
      }
    }
    return null;
  }

  // Force the Gregorian calendar even in Thai, so the year shown always
  // matches the actual dates stored/compared against (th-TH defaults to the
  // Buddhist Era, which would be confusing here).
  const monthLabel = cursor.toLocaleDateString(locale === "th" ? "th-TH-u-ca-gregory" : "en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-card border border-outline bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-base font-semibold text-dark">{t.calendar.title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="rounded-control p-1.5 hover:bg-panel"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4 text-text" />
          </button>
          <span className="w-32 text-center text-sm font-medium text-text">{monthLabel}</span>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="rounded-control p-1.5 hover:bg-panel"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4 text-text" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-y-1 text-center text-xs text-muted">
        {WEEKDAYS[locale].map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-y-1 text-center text-sm">
        {days.map((day, i) => {
          if (!day) return <span key={`empty-${i}`} />;
          const booked = rangeForDay(day);
          const isToday = isSameDay(day, today);

          let cellClasses = "mx-auto flex h-8 w-8 items-center justify-center rounded-full transition-colors";
          if (booked) {
            cellClasses += booked.isStart || booked.isEnd
              ? " bg-booked2 text-white font-medium"
              : " bg-booked/80 text-white";
          } else if (isToday) {
            cellClasses += " border border-primary text-primary font-medium";
          } else {
            cellClasses += " text-text hover:bg-panel";
          }

          return (
            <span key={day.toISOString()} className={cellClasses} title={booked ? t.calendar.booked : undefined}>
              {day.getDate()}
            </span>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-booked" /> {t.calendar.booked}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-booked2" /> {t.calendar.checkInOut}
        </span>
      </div>
    </div>
  );
}
