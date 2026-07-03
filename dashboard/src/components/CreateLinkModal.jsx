import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Share2, QrCode, CheckCircle, X, Plus } from 'lucide-react'
import { api } from '../api.js'
import { getShareLink } from '../config.js'

const STEPS = { CONFIRM: 'confirm', CREATING: 'creating', DONE: 'done' }

export default function CreateLinkModal({ onClose, onCreated }) {
  const [step, setStep]       = useState(STEPS.CONFIRM)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [copied, setCopied]   = useState(false)
  const [showQR, setShowQR]   = useState(false)

  const create = async () => {
    setLoading(true); setError('')
    setStep(STEPS.CREATING)
    try {
      const linkRes = await api.post('/invite-links', {})
      setResult(linkRes.link)
      setStep(STEPS.DONE)
    } catch (err) {
      setError(err.message || 'Failed to create link. Is the backend running?')
      setStep(STEPS.CONFIRM)
    }
    setLoading(false)
  }

  const shareLink = result ? getShareLink(result.token) : ''

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink)
    setCopied('link'); setTimeout(() => setCopied(false), 1500)
  }
  const copyToken = () => {
    navigator.clipboard.writeText(result?.token)
    setCopied('token'); setTimeout(() => setCopied(false), 1500)
  }
  const nativeShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'Pixo Invite', text: 'Join my Pixo session', url: shareLink })
    } else { copyLink() }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ width: step === STEPS.DONE ? 460 : 420 }}>

        {/* ── Step: Confirm Create ── */}
        {step === STEPS.CONFIRM && (
          <>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔗</div>
            <div className="modal-title">Create New Invite Link</div>
            <div className="modal-sub">This will generate a new shareable link for your provider devices to connect.</div>
            {error && <div className="error-msg" style={{ marginBottom: 16 }}>⚠ {error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button id="create-link-confirm-btn" className="btn btn-primary" style={{ flex: 1, gap: 6 }} onClick={create} disabled={loading}>
                <Plus size={14} strokeWidth={2.5} />
                {loading ? 'Creating…' : 'Create Link →'}
              </button>
            </div>
          </>
        )}

        {/* ── Step: Creating ── */}
        {step === STEPS.CREATING && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
            <div style={{ fontWeight: 600 }}>Creating your invite link…</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>Just a moment</div>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === STEPS.DONE && result && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
              <div className="modal-title">Link Created!</div>
              <div className="modal-sub" style={{ marginBottom: 0 }}>Share this link with provider phones to grant access.</div>
            </div>

            {/* Full Share Link */}
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Share Link</label>
              <div className="copy-row">
                <span className="copy-val" style={{ fontSize: 12, wordBreak: 'break-all' }}>{shareLink}</span>
                <button className="btn btn-primary btn-sm" onClick={copyLink} style={{ flexShrink: 0, gap: 5 }}>
                  {copied === 'link' ? <><CheckCircle size={12}/>Copied</> : <><Copy size={12}/>Copy</>}
                </button>
              </div>
            </div>

            {/* QR Code toggle */}
            <div style={{ marginBottom: 14 }}>
              <button className="btn btn-ghost btn-sm" style={{ width: '100%', gap: 6 }} onClick={() => setShowQR(v => !v)}>
                <QrCode size={13}/> {showQR ? 'Hide QR Code' : 'Show QR Code'}
              </button>
              {showQR && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14, padding: 16, background: '#fff', borderRadius: 12 }}>
                  <QRCodeSVG value={shareLink} size={180} />
                </div>
              )}
            </div>

            {/* Token + meta */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { lbl: 'Invite Token', val: result.token },
                { lbl: 'Max Devices',  val: result.max_devices },
                { lbl: 'Status',       val: result.status },
                { lbl: 'Expires',      val: new Date(result.expires_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) },
              ].map((item, k) => (
                <div key={k} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>{item.lbl}</div>
                  <div style={{ fontWeight: 700, marginTop: 2, fontSize: 13 }}>{item.val}</div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <button className="btn btn-primary" style={{ gap: 6 }} onClick={nativeShare}><Share2 size={14}/> Share Link</button>
              <button className="btn btn-ghost" style={{ gap: 6 }} onClick={copyToken}>
                {copied === 'token' ? <><CheckCircle size={12}/>Copied</> : <><Copy size={12}/>Copy Token</>}
              </button>
            </div>
            <button id="done-btn" className="btn btn-ghost" style={{ width: '100%' }} onClick={onCreated}>Done →</button>
          </div>
        )}
      </div>
    </div>
  )
}
