/** Supabase/PostgREST errors are often plain objects, not `Error` instances. */
export function getErrorMessage(e: unknown, fallback = 'Something went wrong.'): string {
  if (e instanceof Error) return e.message || fallback
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message
    if (typeof m === 'string' && m.length > 0) return m
  }
  return fallback
}
