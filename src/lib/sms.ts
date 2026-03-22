import { normalizeUsPhoneE164 } from './phone'

/**
 * Opens the device SMS app with an optional recipient and body.
 * - E.164 must be URL-encoded (`+` → `%2B`) or the To field is often left blank.
 * - iOS expects `sms:addr&body=` (ampersand before body).
 * - Android: `smsto:addr?body=` with the same encoded address.
 * Programmatic `<a href>` click tends to work more reliably than `location.assign` in PWAs/in-app browsers.
 */
export function openSmsComposer(body: string, phoneRaw: string | null | undefined) {
  const encodedBody = encodeURIComponent(body)
  const e164 = normalizeUsPhoneE164((phoneRaw ?? '').trim())

  if (!e164 || e164.length < 4) {
    navigateSms(`sms:?body=${encodedBody}`)
    return
  }

  const addr = encodeURIComponent(e164)
  const ua = navigator.userAgent || ''
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  const href = isIOS
    ? `sms:${addr}&body=${encodedBody}`
    : `smsto:${addr}?body=${encodedBody}`

  navigateSms(href)
}

function navigateSms(href: string) {
  const a = document.createElement('a')
  a.href = href
  a.rel = 'noopener noreferrer'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
