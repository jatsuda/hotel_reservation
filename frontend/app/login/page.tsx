"use client";

import { useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { ApiRequestError } from "@/lib/api";

// Only same-site paths are allowed as a post-login destination. Without this,
// /login?redirect=https://evil.example (or //evil.example) would send a freshly
// logged-in user to an attacker's page - a classic phishing helper.
function safeRedirectPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null; // absolute URLs, "javascript:", etc.
  if (value.startsWith("//") || value.startsWith("/\\")) return null; // protocol-relative
  if (/[\u0000-\u001f\\]/.test(value)) return null; // control chars / backslashes
  return value;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { t } = useLocale();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      const redirect = safeRedirectPath(searchParams.get("redirect"));
      if (redirect) {
        router.push(redirect);
      } else if (user.role === "ADMIN" || user.role === "HOTEL_OWNER" || user.role === "HOTEL_STAFF") {
        router.push("/admin");
      } else {
        router.push("/reservations");
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not log in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:block">
        {/* IMAGE PLACEHOLDER
            ใส่รูป Lobby โรงแรมหรู หรือห้องพักโรงแรม
            อัตราส่วน 16:9 หรือ 4:3 ภาพแนวนอน โทน Warm/Beige/Brown คุณภาพสูง */}
        <ImagePlaceholder
          src="/images/login/hotel-login.jpg"
          label="Hotel login image"
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

          <h1 className="mt-8 font-heading text-2xl font-semibold text-dark">{t.auth.welcomeBack}</h1>
          <p className="mt-1 text-sm text-muted">{t.auth.loginSubtitle}</p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
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
              <span className="text-xs font-medium text-muted">{t.auth.password}</span>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-control border border-secondary bg-card px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-text">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-secondary text-primary focus:ring-primary"
                />
                {t.auth.rememberMe}
              </label>
              <a href="#" className="text-primary hover:underline">
                {t.auth.forgotPassword}
              </a>
            </div>

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
              {submitting ? t.auth.loggingIn : t.auth.loginButton}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {t.auth.noAccount}{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              {t.auth.createAccount}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
