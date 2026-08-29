import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Minimal config: no incremental cache / KV / R2 bindings needed for this
// app — every page that needs fresh data is already dynamic (Server
// Components hitting Supabase directly), so there's nothing here to cache
// across requests. Add an `incrementalCache` binding later only if a page
// is deliberately made static/ISR.
//
// Middleware stays external + edge (the Cloudflare adapter's default and,
// as of this project's testing, its only reliable option) — see the comment
// in src/middleware.ts for why this app intentionally keeps the classic
// `middleware.ts` (edge) convention instead of Next.js 16's `proxy.ts`
// (Node.js-only) one.
export default defineCloudflareConfig();
