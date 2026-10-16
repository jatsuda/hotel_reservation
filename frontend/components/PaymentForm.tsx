"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import type { PaymentMethod } from "@/lib/types";

interface PaymentFormProps {
  onSubmit: (method: PaymentMethod, details: { cardNumber?: string; cardholderName?: string }) => void;
  submitting?: boolean;
}

export default function PaymentForm({ onSubmit, submitting }: PaymentFormProps) {
  const { t } = useLocale();
  const [method, setMethod] = useState<PaymentMethod>("CREDIT_CARD");
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const METHODS: { value: PaymentMethod; label: string }[] = [
    { value: "CREDIT_CARD", label: t.paymentForm.creditCard },
    { value: "DEBIT_CARD", label: t.paymentForm.debitCard },
    { value: "BANK_TRANSFER", label: t.paymentForm.bankTransfer },
    { value: "CASH", label: t.paymentForm.cash },
  ];

  const isCard = method === "CREDIT_CARD" || method === "DEBIT_CARD";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(method, { cardNumber, cardholderName });
      }}
      className="flex flex-col gap-5 rounded-card border border-secondary/60 bg-card p-6 shadow-soft"
    >
      <div>
        <span className="mb-2 block text-xs font-medium text-muted">{t.paymentForm.paymentMethod}</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {METHODS.map((m) => (
            <button
              type="button"
              key={m.value}
              onClick={() => setMethod(m.value)}
              className={`rounded-control border px-3 py-2 text-xs font-medium transition-colors ${
                method === m.value
                  ? "border-primary bg-primary text-white"
                  : "border-secondary text-text hover:bg-secondary/30"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {isCard && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <CreditCard className="h-3.5 w-3.5" /> {t.paymentForm.cardNumber}
            </span>
            <input
              required
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="1234 5678 9012 3456"
              className="rounded-control border border-secondary bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-muted">{t.paymentForm.cardholderName}</span>
            <input
              required
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="Name as shown on card"
              className="rounded-control border border-secondary bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-muted">{t.paymentForm.expiryDate}</span>
              <input
                required
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                placeholder="MM/YY"
                className="rounded-control border border-secondary bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-muted">{t.paymentForm.cvv}</span>
              <input
                required
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                placeholder="123"
                className="rounded-control border border-secondary bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-control bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-dark disabled:opacity-50"
      >
        {submitting ? t.paymentForm.processing : t.paymentForm.payNow}
      </button>
    </form>
  );
}
