/**
 * Opens the device SMS app with an optional recipient (E.164) and body.
 * iOS requires `sms:number&body=` (ampersand); `?body=` can prevent the To field from filling.
 * Android uses `smsto:` so the recipient reliably appears in the To field.
 */
export function openSmsComposer(body: string, phoneE164: string | null) {
  const encoded = encodeURIComponent(body)

  if (!phoneE164 || phoneE164.length < 4) {
    window.location.assign(`sms:?body=${encoded}`)
    return
  }

  const ua = navigator.userAgent || ''
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  if (isIOS) {
    window.location.assign(`sms:${phoneE164}&body=${encoded}`)
  } else {
    window.location.assign(`smsto:${phoneE164}?body=${encoded}`)
  }
}
