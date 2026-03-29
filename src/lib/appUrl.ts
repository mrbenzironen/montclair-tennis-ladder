/** Public web app URL. Override with VITE_PUBLIC_APP_URL for previews, Vercel previews, or local dev. */
export function getAppPublicUrl(): string {
  const v = import.meta.env.VITE_PUBLIC_APP_URL
  if (typeof v === 'string' && v.trim().length > 0) return v.replace(/\/$/, '')
  return 'https://montclair-tennis-ladder.vercel.app'
}

/**
 * Redirect target for Supabase magic links / PKCE — must match the URL the user actually opened
 * (custom domain vs Vercel vs localhost). Add every origin you use to Supabase Auth → Redirect URLs.
 */
export function getAuthEmailRedirectUrl(): string {
  if (typeof window === 'undefined') return getAppPublicUrl()
  const path = window.location.pathname || '/'
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
}

/** Link that opens the app on the Challenges tab (accept / decline). */
export function getChallengesDeepLinkUrl(): string {
  return `${getAppPublicUrl()}/?tab=challenges`
}
