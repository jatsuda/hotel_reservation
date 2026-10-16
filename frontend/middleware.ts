import { NextRequest, NextResponse } from "next/server";

// Lightweight UX guard: redirects to /login if the role cookie isn't ADMIN,
// HOTEL_OWNER, or HOTEL_STAFF. This is NOT the real security boundary -
// Spring Security enforces authorization on every API call regardless of
// what happens here. This middleware only prevents the admin UI from
// rendering for the wrong role (a HOTEL_OWNER/HOTEL_STAFF who gets in still
// only sees/edits their own hotel, further limited by permissions for
// HOTEL_STAFF - that scoping happens in the pages themselves and, for real,
// on the backend).
export function middleware(request: NextRequest) {
  const role = request.cookies.get("hotel_auth_role")?.value;
  const allowedRoles = ["ADMIN", "HOTEL_OWNER", "HOTEL_STAFF"];

  if (request.nextUrl.pathname.startsWith("/admin") && !allowedRoles.includes(role ?? "")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
