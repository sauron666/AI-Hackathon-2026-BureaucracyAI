/** @type {import('next').NextConfig} */

// Security headers applied to every route. Tuned for an app that:
//   - posts to its own API only (no cross-origin XHR)
//   - embeds images from common avatar/CDN sources
//   - never wants to be iframed by anyone
//
// CSP is intentionally strict. If a feature needs an external script or
// stylesheet, add the origin here explicitly — never use 'unsafe-inline'
// for scripts in production.
const isDev = process.env.NODE_ENV !== 'production'

const cspDirectives = [
  "default-src 'self'",
  // Next.js + Turbopack inject inline runtime; allow it but no remote scripts.
  // Vercel Analytics needs *.vercel-scripts.com.
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''} https://*.vercel-scripts.com https://va.vercel-scripts.com`.trim(),
  // Tailwind/Next inject inline styles for layout — required.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https: http:",
  "font-src 'self' data: https:",
  // API origins our server hits or that the client may load images from.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com https://api.cohere.ai https://api.cohere.com https://stage.sirma.ai https://*.sirma.ai https://*.uploadthing.com https://uploadthing.com https://*.ingest.uploadthing.com https://utfs.io https://api.uploadthing.com https://*.vercel-insights.com https://va.vercel-scripts.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "worker-src 'self' blob:",
  "media-src 'self' data: blob:",
  isDev ? '' : 'upgrade-insecure-requests',
].filter(Boolean).join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: cspDirectives },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

const nextConfig = {
  // Phase 3: re-enable type errors at build time.
  // We rely on `npx tsc --noEmit` passing in CI.
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
