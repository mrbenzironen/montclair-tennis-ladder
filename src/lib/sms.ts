/**
 * Opens the device SMS app with an optional recipient (E.164) and body.
 * Works on iOS Safari and Android Chrome when installed as PWA / browser.
 */
export function openSmsComposer(body: string, phoneE164: string | null) {
  const encoded = encodeURIComponent(body)
  const href =
    phoneE164 && phoneE164.length >= 4
      ? `sms:${phoneE164}?body=${encoded}`
      : `sms:?body=${encoded}`
  window.location.assign(href)
}
