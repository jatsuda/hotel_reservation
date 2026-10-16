"use client";

import { useState, FormEvent } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import SiteShell from "@/components/SiteShell";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // This reference build has no messaging backend yet - wire this up to
    // a real POST /api/contact endpoint (or an email service) when needed.
    setSent(true);
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-heading text-2xl font-semibold text-dark sm:text-3xl">Contact us</h1>
        <p className="mt-2 text-sm text-muted">
          Questions about a booking, a hotel, or anything else - send us a message.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="flex flex-col gap-5 sm:col-span-1">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium text-text">Email</p>
                <p className="text-xs text-muted">support@aureliastay.com</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium text-text">Phone</p>
                <p className="text-xs text-muted">+66 2 123 4567</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium text-text">Head office</p>
                <p className="text-xs text-muted">Bangkok, Thailand</p>
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            {sent ? (
              <div className="rounded-card border border-secondary/60 bg-card p-6 text-center shadow-soft">
                <p className="font-medium text-text">Thanks - your message has been sent.</p>
                <p className="mt-1 text-sm text-muted">We'll get back to you as soon as we can.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-card border border-secondary/60 bg-card p-6 shadow-soft">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-muted">Name</span>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-control border border-secondary bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-muted">Email</span>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-control border border-secondary bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-muted">Message</span>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="rounded-control border border-secondary bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </label>
                <button
                  type="submit"
                  className="mt-2 rounded-control bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-dark"
                >
                  Send message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
