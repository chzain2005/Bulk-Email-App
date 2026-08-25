import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Small helper so components can attach the current session's access
// token to backend API calls, e.g.:
//   const token = await getAccessToken();
//   fetch('/api/campaigns', { headers: { Authorization: `Bearer ${token}` } })
export async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}
