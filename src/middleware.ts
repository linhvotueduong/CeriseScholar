import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_EMAIL = "cerisescholar@gmail.com";

/**
 * Middleware that runs on every request.
 * Kept as `middleware` (not `proxy`) because Next 16.2.1's dev runtime
 * still emits a middleware-manifest and 500s without it.
 * - Refreshes the user's auth session (so they stay logged in)
 * - Redirects non-logged-in users away from /dashboard pages
 * - Redirects logged-in users away from /login and /signup pages
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hasSupabaseAuthCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-"));

  if (!hasSupabaseAuthCookie && (path === "/login" || path === "/signup")) {
    return NextResponse.next({ request });
  }

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
  // are caught immediately — important for a public-facing app.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is NOT logged in and trying to access /dashboard, redirect to /login
  if (!user && path.startsWith("/dashboard")) {
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
    if (user.email?.toLowerCase() !== ADMIN_EMAIL) {
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
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/signup"],
};
