import type { Metadata } from "next";
import { Poppins, Prompt } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { LocaleProvider } from "@/lib/locale-context";

// Loaded via next/font for automatic self-hosting + no layout shift.
// Poppins is used for English; Prompt (Google Font) is used for Thai, since
// it has proper Thai glyph coverage that Poppins lacks. Both are loaded as
// CSS variables, and globals.css switches which one "--font-active" points
// to based on the `data-locale` attribute LocaleProvider sets on <html>.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const prompt = Prompt({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AureliaStay | Hotel Reservation System",
  description: "Modern luxury hotel booking, backed by a real Spring Boot + MySQL backend.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${prompt.variable}`}>
      <body className="min-h-screen bg-background font-body text-text antialiased">
        <LocaleProvider>
          <AuthProvider>{children}</AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
