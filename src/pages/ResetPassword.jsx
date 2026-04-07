import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const font = "'Plus Jakarta Sans', sans-serif"

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`
    })
    if (err) setError(err.message)
    else setSent(true)
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px', border: '2px solid #E2E8F0', borderRadius: 10,
    fontSize: 15, fontFamily: font, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ fontFamily: font, minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0F172A' }}>Reset password</h1>
          <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 14 }}>We'll send you a reset link</p>
        </div>

        {sent ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, textAlign: 'center', boxShadow: '0 1px 3px rgba(15,23,42,.06)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
            <p style={{ color: '#334155', fontSize: 15 }}>Check your email for a password reset link.</p>
            <Link to="/login" style={{ color: '#0F766E', fontSize: 14 }}>Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 1px 3px rgba(15,23,42,.06)' }}>
            {error && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="you@example.com" />
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px', border: 'none', borderRadius: 10, background: '#0F766E',
              color: '#fff', fontSize: 15, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', fontFamily: font,
            }}>{loading ? 'Sending...' : 'Send reset link'}</button>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/login" style={{ color: '#64748B', fontSize: 13, textDecoration: 'none' }}>Back to login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
