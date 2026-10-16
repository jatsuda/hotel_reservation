"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import Button from "@/components/Button";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { changePassword, changeEmail, ApiRequestError } from "@/lib/api";

// Reachable by any logged-in account, but the main reason this page exists is
// the HOTEL_OWNER/HOTEL_STAFF accounts, which start on an owner-issued
// temporary password (see backend DataInitializer/StaffService) and are
// expected to set their own email/password here.
export default function AccountSettingsPage() {
  const { user, loading, applySession } = useAuth();
  const { t } = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/account/password");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <SiteShell>
        <p className="text-sm text-muted">{t.admin.checkingAccess}</p>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-md">
        <h1 className="font-heading text-2xl font-semibold text-dark">{t.accountSettingsPage.title}</h1>
        <p className="mt-1 text-sm text-muted">{t.accountSettingsPage.subtitle}</p>

        <div className="mt-8">
          <EmailForm currentEmail={user.email} applySession={applySession} />
        </div>
        <div className="mt-10 border-t border-secondary/60 pt-8">
          <PasswordForm />
        </div>
      </div>
    </SiteShell>
  );
}

function EmailForm({
  currentEmail,
  applySession,
}: {
  currentEmail: string;
  applySession: ReturnType<typeof useAuth>["applySession"];
}) {
  const { t } = useLocale();
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const res = await changeEmail({ newEmail, currentPassword });
      // The old token stops working the instant the email changes - swap
      // in the fresh one the backend just issued.
      applySession(res);
      setSuccess(true);
      setNewEmail("");
      setCurrentPassword("");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t.changeEmail.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h2 className="font-heading text-lg font-semibold text-dark">{t.changeEmail.title}</h2>
      <p className="mt-1 text-sm text-muted">{t.changeEmail.subtitle}</p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-text">{t.changeEmail.currentEmail}</label>
          <input
            type="email"
            disabled
            value={currentEmail}
            className="w-full rounded-control border border-secondary bg-secondary/20 px-3 py-2 text-sm text-muted"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text">{t.changeEmail.newEmail}</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full rounded-control border border-secondary bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text">{t.changeEmail.currentPassword}</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-control border border-secondary bg-background px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">{t.changeEmail.success}</p>}

        <Button type="submit" disabled={submitting} fullWidth>
          {submitting ? t.changeEmail.submitting : t.changeEmail.submit}
        </Button>
      </form>
    </>
  );
}

function PasswordForm() {
  const { t } = useLocale();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError(t.changePassword.errorMismatch);
      return;
    }

    setSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t.changePassword.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h2 className="font-heading text-lg font-semibold text-dark">{t.changePassword.title}</h2>
      <p className="mt-1 text-sm text-muted">{t.changePassword.subtitle}</p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-text">{t.changePassword.currentPassword}</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-control border border-secondary bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text">{t.changePassword.newPassword}</label>
          <input
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-control border border-secondary bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text">{t.changePassword.confirmPassword}</label>
          <input
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-control border border-secondary bg-background px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">{t.changePassword.success}</p>}

        <Button type="submit" disabled={submitting} fullWidth>
          {submitting ? t.changePassword.submitting : t.changePassword.submit}
        </Button>
      </form>
    </>
  );
}
