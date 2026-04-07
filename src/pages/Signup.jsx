import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { VERSION } from '../lib/version'

const font = "'Plus Jakarta Sans', sans-serif"

export default function Signup() {
  const { signUp } = useAuth()
  const [fullName, setFullName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    const { error: err } = await signUp({ email, password, fullName, orgName })
    if (err) setError(err.message)
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
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#0F766E', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, marginBottom: 12 }}>S</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0F172A' }}>Create account</h1>
          <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 14 }}>Set up your organization</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 1px 3px rgba(15,23,42,.06), 0 4px 12px rgba(15,23,42,.04)' }}>
          {error && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Full name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} required style={inputStyle} placeholder="Michael Ashiteye" />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Organization name</label>
            <input value={orgName} onChange={e => setOrgName(e.target.value)} required style={inputStyle} placeholder="METSS LBG" />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="you@example.com" />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} placeholder="Min. 6 characters" />
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px', border: 'none', borderRadius: 10, background: '#0F766E',
            color: '#fff', fontSize: 15, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', fontFamily: font, opacity: loading ? 0.7 : 1,
          }}>{loading ? 'Creating...' : 'Create account'}</button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#64748B' }}>
          Already have an account? <Link to="/login" style={{ color: '#0F766E', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#CBD5E1' }}>SignIn v{VERSION}</p>
      </div>
    </div>
  )
}
