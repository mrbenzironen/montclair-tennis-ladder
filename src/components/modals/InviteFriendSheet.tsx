import { useState } from 'react'
import { INVITE_SHARE_TEXT, canUseWebShare } from '../../lib/inviteShare'

interface Props {
  onClose: () => void
  /** Called after a successful share or copy (optional toast in parent). */
  onSent: () => void
}

export function InviteFriendSheet({ onClose, onSent }: Props) {
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')

  const shareAvailable = canUseWebShare()

  async function handleShare() {
    if (!shareAvailable) return
    setSharing(true)
    setCopyError('')
    try {
      await navigator.share({ text: INVITE_SHARE_TEXT })
      onSent()
      onClose()
    } catch (e: unknown) {
      const err = e as { name?: string }
      if (err?.name === 'AbortError') {
        /* user dismissed */
      } else {
        setCopyError('Sharing failed. Copy the text below instead.')
      }
    }
    setSharing(false)
  }

  async function handleCopy() {
    setCopyError('')
    try {
      await navigator.clipboard.writeText(INVITE_SHARE_TEXT)
      setCopied(true)
      onSent()
      onClose()
    } catch {
      setCopyError('Could not copy. Select the text and copy manually.')
    }
  }

  return (
    <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && !sharing && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />

        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 800, textTransform: 'uppercase', color: '#201c1d', padding: '16px 20px 4px' }}>
          Invite a friend
        </div>
        <div style={{ fontSize: 13, color: '#7a7672', fontWeight: 300, lineHeight: 1.5, padding: '0 20px 16px' }}>
          {shareAvailable
            ? 'Share the message below, or copy it to paste anywhere.'
            : 'Copy the message below to text or email.'}
        </div>

        <div
          style={{
            margin: '0 20px 16px',
            padding: '12px 14px',
            background: '#f6f5f3',
            borderRadius: 8,
            border: '1px solid #e6e4e0',
            fontSize: 13,
            color: '#201c1d',
            lineHeight: 1.5,
            wordBreak: 'break-word',
            userSelect: 'text',
          }}
        >
          {INVITE_SHARE_TEXT}
        </div>

        {copyError && (
          <div style={{ margin: '0 20px 12px', padding: '10px 14px', background: '#fde8e8', borderRadius: 6, fontSize: 12, color: '#c0392b' }}>
            {copyError}
          </div>
        )}

        <div style={{ padding: '0 20px' }}>
          {shareAvailable && (
            <button
              type="button"
              className="btn-primary"
              disabled={sharing}
              onClick={() => void handleShare()}
              style={{ background: '#c4e012', color: '#201c1d' }}
            >
              {sharing ? 'Opening…' : 'Share invite'}
            </button>
          )}
          <button
            type="button"
            className={shareAvailable ? 'btn-secondary' : 'btn-primary'}
            onClick={() => void handleCopy()}
            style={!shareAvailable ? { background: '#c4e012', color: '#201c1d' } : {}}
          >
            {copied ? 'Copied!' : 'Copy message'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={sharing}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
