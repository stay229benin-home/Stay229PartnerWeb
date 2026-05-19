/**
 * Stay229 Partner Web — Next.js config.
 *
 * Architecture App Router (Next 14). Pas de redirect server-side complexe :
 * la session Supabase est gérée côté client via @supabase/ssr.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
};

module.exports = nextConfig;
