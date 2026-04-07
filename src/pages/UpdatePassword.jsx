import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const font = "'Plus Jakarta Sans', sans-serif"

export default function UpdatePassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) setError(err.message)
    else navigate('/')
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
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0F172A' }}>Set new password</h1>
        </div>
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 1px 3px rgba(15,23,42,.06)' }}>
          {error && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>New password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} placeholder="Min. 6 characters" />
          </div>
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px', border: 'none', borderRadius: 10, background: '#0F766E',
            color: '#fff', fontSize: 15, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', fontFamily: font,
          }}>{loading ? 'Updating...' : 'Update password'}</button>
        </form>
      </div>
    </div>
  )
}
