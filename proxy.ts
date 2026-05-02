/**
 * Next.js proxy (formerly middleware).
 *
 * Two responsibilities:
 *   1. Refresh the Supabase auth session if cookies got stale.
 *   2. Issue / verify the CSRF cookie (double-submit pattern).
 *
 * Both run on every request matched by the `config.matcher` below.
 *
 * Note on layering: the proxy enforces CSRF only on /api/* mutating routes.
 * For UI navigations (POST from a form-action, etc.), individual route
 * handlers should re-verify with `verifyCsrfFromRequest(req)` for defense
 * in depth.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  generateCsrfToken,
  isCsrfExempt,
} from '@/lib/security/csrf';

export async function proxy(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // ----- CSRF check (before any heavy work) -----
  const pathname = req.nextUrl.pathname;
  const method = req.method.toUpperCase();
  const isApiRoute = pathname.startsWith('/api/');

  if (isApiRoute && !isCsrfExempt(method, pathname)) {
    const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
    const headerToken = req.headers.get(CSRF_HEADER_NAME);

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return new NextResponse(
        JSON.stringify({
          error: 'CSRF token mismatch',
          hint: 'Include the fw_csrf cookie value in the x-csrf-token header.',
        }),
        {
          status: 403,
          headers: { 'content-type': 'application/json' },
        },
      );
    }
  }

  // ----- Build response, optionally with Supabase session refresh -----
  let response = NextResponse.next({ request: req });

  if (supabaseUrl && anonKey) {
    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            req.cookies.set(name, value);
          }
          response = NextResponse.next({ request: req });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });
    await supabase.auth.getUser();
  }

  // ----- Ensure CSRF cookie exists (non-HttpOnly so JS can read it) -----
  if (!req.cookies.get(CSRF_COOKIE_NAME)) {
    response.cookies.set(CSRF_COOKIE_NAME, generateCsrfToken(), {
      httpOnly: false, // intentional — client JS must echo this in the header
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every route except:
     *   - static assets
     *   - image optimizer
     *   - favicon, sitemap, robots
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
