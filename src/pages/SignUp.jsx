import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { AuthShell } from './Login'

export default function SignUp() {
  const { signUp } = useAuth()
  const [fullName, setFullName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password, fullName, orgName)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <AuthShell>
        <div className="text-center">
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: '#ECFDF5', color: '#065F46',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, marginBottom: 12,
          }}>✓</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Check your email</h2>
          <p className="text-sm text-muted">
            We sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your account, then come back to sign in.
          </p>
          <Link to="/login" className="btn btn-primary btn-full mt-6">Go to sign in</Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="text-center mb-4">
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Create your account</h1>
        <p className="text-sm text-muted mt-2">Set up your organization in 30 seconds</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Your full name</label>
          <input type="text" className="form-input" placeholder="e.g. Michael Ashiteye"
            value={fullName} onChange={e => setFullName(e.target.value)} required autoFocus />
        </div>

        <div className="form-group">
          <label className="form-label">Organization name</label>
          <input type="text" className="form-input" placeholder="e.g. METSS LBG"
            value={orgName} onChange={e => setOrgName(e.target.value)} required />
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input type="email" className="form-input" placeholder="you@organization.org"
            value={email} onChange={e => setEmail(e.target.value)} required />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input type="password" className="form-input" placeholder="At least 6 characters"
            value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
        </div>

        <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
          {loading ? <div className="spinner" /> : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm mt-4" style={{ color: 'var(--text-3)' }}>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthShell>
  )
}
