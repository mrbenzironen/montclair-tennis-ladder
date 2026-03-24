/** Public web app URL. Override with VITE_PUBLIC_APP_URL for previews, Vercel previews, or local dev. */
export function getAppPublicUrl(): string {
  const v = import.meta.env.VITE_PUBLIC_APP_URL
  if (typeof v === 'string' && v.trim().length > 0) return v.replace(/\/$/, '')
  return 'https://montclair.tennis'
}

/** Link that opens the app on the Challenges tab (accept / decline). */
export function getChallengesDeepLinkUrl(): string {
  return `${getAppPublicUrl()}/?tab=challenges`
}
