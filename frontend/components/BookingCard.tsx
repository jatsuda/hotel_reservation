interface LineItem {
  label: string;
  value: string;
  muted?: boolean;
}

interface BookingCardProps {
  title?: string;
  items: LineItem[];
  total: string;
  children?: React.ReactNode; // e.g. a Continue/Pay button
}

/**
 * Reusable price/booking summary panel used on the Room detail,
 * Booking, and Payment pages.
 */
export default function BookingCard({ title = "Booking Summary", items, total, children }: BookingCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-secondary/60 bg-card p-6 shadow-soft">
      <h3 className="font-heading text-lg font-semibold text-dark">{title}</h3>

      <div className="flex flex-col gap-3 text-sm">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className={item.muted ? "text-muted" : "text-text"}>{item.label}</span>
            <span className={item.muted ? "text-muted" : "font-medium text-text"}>{item.value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-secondary/60 pt-4">
        <span className="font-heading text-base font-semibold text-dark">Total</span>
        <span className="text-xl font-semibold text-primary">{total}</span>
      </div>

      {children}
    </div>
  );
}
