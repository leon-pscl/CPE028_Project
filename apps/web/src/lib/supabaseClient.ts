/**
 * supabaseClient.ts
 *
 * Barricade-inspired security principles applied to Supabase:
 *  - PKCE flow (no implicit tokens in URL fragments — the critical protection)
 *  - Auto-refresh handled by Supabase before token expiry
 *  - No service role key ever touches the client
 *
 * NOTE ON STORAGE:
 * We use Supabase's default localStorage persistence so the session
 * survives page redirects and refreshes. The real Barricade protection
 * here is PKCE (prevents token interception in redirects) — not memory
 * storage. The Supabase anon JWT stored in localStorage has no elevated
 * privileges and is scoped by RLS policies on every table.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[ReDevice] Missing Supabase environment variables. ' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // PKCE prevents token interception in OAuth/magic-link redirect flows
    flowType: 'pkce',
    // Persist session in localStorage so it survives page navigation and refreshes
    persistSession: true,
    // Automatically refresh the token before it expires
    autoRefreshToken: true,
    // Pick up the session code from the URL after email confirmation redirects
    detectSessionInUrl: true,
  },
})
