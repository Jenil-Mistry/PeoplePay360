import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicRoutes = ["/", "/sign-in", "/sign-up", "/forgot-password", "/reset-password"];
const authApiPrefix = "/api/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Always allow NextAuth API routes
  if (pathname.startsWith(authApiPrefix)) {
    return NextResponse.next();
  }

  // Always allow public routes
  if (publicRoutes.includes(pathname)) {
    // If logged in and trying to access sign-in/sign-up, redirect to dashboard
    if (isLoggedIn && (pathname === "/sign-in" || pathname === "/sign-up")) {
      const user = (req.auth as any)?.user;
      // Admin is allowed to access sign-up to create employee accounts
      if (pathname === "/sign-up" && user?.role === "ADMIN") {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
    return NextResponse.next();
  }

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Protected routes — redirect to sign-in if not authenticated
  if (!isLoggedIn) {
    const signInUrl = new URL("/sign-in", req.nextUrl);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const role = (req.auth as any)?.user?.role || "EMPLOYEE";

  // Route-based RBAC enforcement
  // Reports: PAYROLL_MANAGER and ADMIN only
  if (pathname.startsWith("/reports")) {
    if (role !== "PAYROLL_MANAGER" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
  }

  // Payroll route RBAC:
  // - EMPLOYEE can only access /payroll/payslips (to download own payslips)
  // - HR_MANAGER can access /payroll/payslips and /payroll/payruns (to distribute payslips)
  // - PAYROLL_USER, PAYROLL_MANAGER, ADMIN have full payroll route access
  if (pathname.startsWith("/payroll")) {
    if (role === "EMPLOYEE" && !pathname.startsWith("/payroll/payslips")) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
    if (
      role === "HR_MANAGER" &&
      !pathname.startsWith("/payroll/payslips") &&
      !pathname.startsWith("/payroll/payruns")
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
