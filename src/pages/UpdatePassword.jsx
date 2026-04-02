import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { AuthShell } from './Login'

export default function UpdatePassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      await updatePassword(password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <AuthShell>
      <div className="text-center mb-4">
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Set new password</h1>
        <p className="text-sm text-muted mt-2">Choose a strong password for your account</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">New password</label>
          <input type="password" className="form-input" placeholder="At least 6 characters"
            value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoFocus />
        </div>

        <div className="form-group">
          <label className="form-label">Confirm password</label>
          <input type="password" className="form-input" placeholder="Type it again"
            value={confirm} onChange={e => setConfirm(e.target.value)} required />
        </div>

        <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
          {loading ? <div className="spinner" /> : 'Update password'}
        </button>
      </form>
    </AuthShell>
  )
}
