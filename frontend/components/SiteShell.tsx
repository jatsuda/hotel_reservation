import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

/**
 * Wraps every page except /login with the shared Navbar (top),
 * Sidebar (desktop only, left), and Footer - matching the reference
 * layout: LOGO + nav on top, sidebar + main content below.
 */
export default function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <Sidebar />
        <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
