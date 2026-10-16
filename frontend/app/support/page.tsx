"use client";

import { useState } from "react";
import { ChevronDown, Mail, Phone, MessageCircle } from "lucide-react";
import SiteShell from "@/components/SiteShell";

const FAQS = [
  {
    q: "How do I book a room?",
    a: "Browse hotels from the Home or Hotels page, open a room you like, and click New Booking. You'll need to log in or create an account first - this keeps your booking history and reservations tied to your account.",
  },
  {
    q: "Do I need an account to look around?",
    a: "No - you can browse every hotel and room without logging in. An account is only required at the point of actually reserving a room.",
  },
  {
    q: "Can I cancel a reservation?",
    a: "Yes. Go to My Reservations, find the booking, and click Cancel. This is only available before check-out, and frees up the room for other guests.",
  },
  {
    q: "What happens after I pay?",
    a: "Your reservation status moves from Pending to Confirmed immediately, and you'll see a confirmation screen with your booking details. You can review it anytime from My Reservations.",
  },
  {
    q: "I'm getting a 'Room Not Available' error - why?",
    a: "This means someone already has a confirmed or pending reservation for that room on overlapping dates. Try different dates or another room.",
  },
  {
    q: "How do I manage hotels or rooms as staff?",
    a: "Admin accounts have access to /admin, where hotels, rooms, and reservations can be managed - including adding new rooms, checking guests in/out, and confirming or cancelling bookings.",
  },
];

export default function SupportPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-heading text-2xl font-semibold text-dark sm:text-3xl">Support</h1>
        <p className="mt-2 text-sm text-muted">
          Answers to common questions about booking, payments, and managing your stay.
        </p>

        <div className="mt-8 flex flex-col divide-y divide-secondary/50 rounded-card border border-secondary/60 bg-card shadow-soft">
          {FAQS.map((item, i) => (
            <div key={item.q} className="p-5">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 text-left"
              >
                <span className="font-medium text-text">{item.q}</span>
                <ChevronDown
                  className={`h-4 w-4 flex-shrink-0 text-muted transition-transform ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === i && <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>}
            </div>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <a
            href="mailto:support@aureliastay.com"
            className="flex flex-col items-center gap-2 rounded-card border border-secondary/60 bg-card p-5 text-center shadow-soft transition-colors hover:bg-secondary/20"
          >
            <Mail className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-text">Email us</span>
            <span className="text-xs text-muted">support@aureliastay.com</span>
          </a>
          <a
            href="tel:+6621234567"
            className="flex flex-col items-center gap-2 rounded-card border border-secondary/60 bg-card p-5 text-center shadow-soft transition-colors hover:bg-secondary/20"
          >
            <Phone className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-text">Call us</span>
            <span className="text-xs text-muted">+66 2 123 4567</span>
          </a>
          <a
            href="/contact"
            className="flex flex-col items-center gap-2 rounded-card border border-secondary/60 bg-card p-5 text-center shadow-soft transition-colors hover:bg-secondary/20"
          >
            <MessageCircle className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-text">Send a message</span>
            <span className="text-xs text-muted">Contact form</span>
          </a>
        </div>
      </div>
    </SiteShell>
  );
}
