import { digitsOnly, normalizeUsPhoneE164 } from './phone'

/**
 * Opens the device SMS app with an optional recipient and body.
 * US numbers: use 10 digits only in the URI (no + / %2B) — most reliably fills the To field.
 * iOS: `sms:5551234567&body=` (ampersand before body).
 * Android: `smsto:5551234567?body=`
 * Non-US E.164: encoded in the URI.
 */
export function openSmsComposer(body: string, phoneRaw: string | null | undefined) {
  const encodedBody = encodeURIComponent(body)
  const e164 = normalizeUsPhoneE164((phoneRaw ?? '').trim())

  if (!e164 || e164.length < 4) {
    navigateSms(`sms:?body=${encodedBody}`)
    return
  }

  const d = digitsOnly(e164)
  const addressInUri =
    d.length === 11 && d.startsWith('1')
      ? d.slice(1)
      : d.length === 10
        ? d
        : encodeURIComponent(e164)

  const ua = navigator.userAgent || ''
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  const href = isIOS
    ? `sms:${addressInUri}&body=${encodedBody}`
    : `smsto:${addressInUri}?body=${encodedBody}`

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
