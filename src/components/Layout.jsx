import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useState } from 'react'

export default function Layout() {
  const { profile, org, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 20px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link to="/" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            textDecoration: 'none', color: 'var(--text)',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'var(--primary)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 14,
            }}>S</div>
            <span style={{ fontWeight: 700, fontSize: 17 }}>SignIn</span>
          </Link>

          <nav style={{ display: 'flex', gap: 4 }}>
            <NavLink to="/" label="Events" active={location.pathname === '/'} />
            <NavLink to="/settings" label="Settings" active={location.pathname === '/settings'} />
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          {org && (
            <span style={{
              fontSize: 12, fontWeight: 600, color: 'var(--text-3)',
              padding: '4px 10px', background: 'var(--surface-2)',
              borderRadius: 6, border: '1px solid var(--border)',
            }}>{org.name}</span>
          )}

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--primary-light)', color: 'var(--primary)',
              fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer',
            }}
          >{initials}</button>

          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{
                position: 'fixed', inset: 0, zIndex: 40,
              }} />
              <div style={{
                position: 'absolute', top: 44, right: 0, zIndex: 50,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)',
                padding: 6, minWidth: 180,
              }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{profile?.full_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{profile?.email}</div>
                </div>
                <button onClick={handleSignOut} style={{
                  width: '100%', textAlign: 'left', padding: '8px 12px',
                  border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: 14, color: 'var(--danger)', borderRadius: 'var(--radius-sm)',
                }}>Sign out</button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main content */}
      <main style={{ padding: '24px 20px', maxWidth: 1100, margin: '0 auto' }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center', padding: '20px',
        fontSize: 12, color: 'var(--text-3)',
      }}>SignIn v2.0.0</footer>
    </div>
  )
}

function NavLink({ to, label, active }) {
  return (
    <Link to={to} style={{
      padding: '6px 14px', borderRadius: 'var(--radius-sm)',
      fontSize: 14, fontWeight: 500, textDecoration: 'none',
      color: active ? 'var(--primary)' : 'var(--text-2)',
      background: active ? 'var(--primary-50)' : 'transparent',
    }}>{label}</Link>
  )
}
<div style={{ textAlign: 'center', padding: '8px', fontSize: 11, color: 'var(--text-3)' }}>
  SignIn v2.1.1
</div>
```

---

**2. `src/pages/AttendPage.jsx`** — find the existing `SignIn v2.1.0` text at the bottom and change it to:
```
SignIn v2.1.1
