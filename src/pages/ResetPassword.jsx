import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { AuthShell } from './Login'

export default function ResetPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <AuthShell>
        <div className="text-center">
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: '#EFF6FF', color: '#1E40AF',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, marginBottom: 12,
          }}>✉</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Check your email</h2>
          <p className="text-sm text-muted">
            If an account exists for <strong>{email}</strong>, we sent a password reset link.
          </p>
          <Link to="/login" className="btn btn-secondary btn-full mt-6">Back to sign in</Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="text-center mb-4">
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Reset password</h1>
        <p className="text-sm text-muted mt-2">Enter your email and we'll send a reset link</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input type="email" className="form-input" placeholder="you@organization.org"
            value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
        </div>

        <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
          {loading ? <div className="spinner" /> : 'Send reset link'}
        </button>
      </form>

      <p className="text-center text-sm mt-4">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthShell>
  )
}
