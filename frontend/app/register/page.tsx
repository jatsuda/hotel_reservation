"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { ApiRequestError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { t } = useLocale();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(fullName, email, password, phone);
      router.push("/reservations");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not create your account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:block">
        {/* IMAGE PLACEHOLDER: Lobby/room, warm tone, high resolution */}
        <ImagePlaceholder
          src="/images/login/hotel-login.jpg"
          label="Create account image"
          note="Luxury lobby or guest room - warm, beige tones, high resolution"
          aspect="aspect-auto h-full"
          className="h-full rounded-none border-0"
        />
      </div>

      <div className="flex items-center justify-center bg-background px-6 py-16">
        <div className="w-full max-w-sm">
          <Link href="/" className="font-heading text-xl font-semibold text-dark">
            Aurelia<span className="text-primary">Stay</span>
          </Link>

          <h1 className="mt-8 font-heading text-2xl font-semibold text-dark">{t.auth.createYourAccount}</h1>
          <p className="mt-1 text-sm text-muted">{t.auth.registerSubtitle}</p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-muted">{t.auth.fullName}</span>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="rounded-control border border-secondary bg-card px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-muted">{t.auth.email}</span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="rounded-control border border-secondary bg-card px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-muted">{t.auth.phone}</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+66 80 000 0000"
                className="rounded-control border border-secondary bg-card px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-muted">{t.auth.password}</span>
              <input
                required
                minLength={8}
                maxLength={72}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8+ characters, letters and numbers"
                className="rounded-control border border-secondary bg-card px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>

            {error && (
              <p className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 rounded-control bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-dark disabled:opacity-50"
            >
              {submitting ? t.auth.creatingAccount : t.auth.createAccount}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {t.auth.alreadyHaveAccount}{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t.auth.logIn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
