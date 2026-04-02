import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Wrong email or password. Try again.'
        : err.message)
    }
    setLoading(false)
  }

  return (
    <AuthShell>
      <div className="text-center mb-4">
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Welcome back</h1>
        <p className="text-sm text-muted mt-2">Sign in to manage your events</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input type="email" className="form-input" placeholder="you@organization.org"
            value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
            <Link to="/reset-password" style={{ fontSize: 12, fontWeight: 500 }}>Forgot?</Link>
          </div>
          <input type="password" className="form-input" placeholder="Enter your password"
            value={password} onChange={e => setPassword(e.target.value)} required
            style={{ marginTop: 5 }} />
        </div>

        <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
          {loading ? <div className="spinner" /> : 'Sign in'}
        </button>
      </form>

      <p className="text-center text-sm mt-4" style={{ color: 'var(--text-3)' }}>
        No account? <Link to="/signup">Create one</Link>
      </p>
    </AuthShell>
  )
}

export function AuthShell({ children }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div className="text-center mb-4">
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'var(--primary)', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 20, marginBottom: 8,
          }}>S</div>
        </div>

        <div className="card card-pad">
          {children}
        </div>

        <p className="text-center mt-4" style={{ fontSize: 11, color: 'var(--text-3)' }}>
          SignIn v2.0.0
        </p>
      </div>
    </div>
  )
}
