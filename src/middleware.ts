import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware that runs on every request.
 * Kept as `middleware` (not `proxy`) because Next 16.2.1's dev runtime
 * still emits a middleware-manifest and 500s without it.
 * - Refreshes the user's auth session (so they stay logged in)
 * - Redirects non-logged-in users away from /dashboard pages
 * - Redirects logged-in users away from /login and /signup pages
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getUser to validate the JWT against Supabase on every request.
  // Slightly slower than getSession, but ensures revoked/expired tokens
  // are caught immediately - important for a public-facing app.
  let user: User | null = null;
  try {
    const {
      data: { user: nextUser },
    } = await supabase.auth.getUser();
    user = nextUser;
  } catch (error) {
    // Network/auth refresh failures should not crash the app shell. Treat the
    // request as unauthenticated and let the route rules below decide.
    console.warn("[auth middleware] Supabase user validation failed.", error);
  }

  const path = request.nextUrl.pathname;

  const isProtectedAppPath =
    path.startsWith("/dashboard") ||
    path === "/research-desk" ||
    path.startsWith("/research-desk/") ||
    path === "/settings" ||
    path.startsWith("/settings/") ||
    path === "/auth/complete-profile";

  // If user is NOT logged in and trying to access a protected app page, redirect to /login
  if (!user && isProtectedAppPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // /admin/* is for the site admin only. Redirect everyone else to /dashboard.
  // Logged-out users get sent to /login first so they can sign in.
  if (path.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (user.email?.toLowerCase() !== "cerisescholar@gmail.com") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // If user IS logged in and trying to access /login or /signup, redirect to /dashboard
  if (user && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

// Only run middleware on these paths (skip static files, images, etc.)
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/research-desk",
    "/research-desk/:path*",
    "/settings",
    "/settings/:path*",
    "/auth/complete-profile",
    "/admin/:path*",
    "/login",
    "/signup",
  ],
};
