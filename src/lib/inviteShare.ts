import { getAppPublicUrl } from './appUrl'

/** Text shared when inviting someone to the ladder (Web Share API or copy). */
export const INVITE_SHARE_TEXT = `Join me on the Montclair Tennis Ladder! Sign up at ${getAppPublicUrl()}`

export function canUseWebShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}
