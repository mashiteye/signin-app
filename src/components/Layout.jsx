import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { VERSION } from '../lib/version'

const font = "'Plus Jakarta Sans', sans-serif"

export default function Layout({ children }) {
  const { profile, org, signOut } = useAuth()
  const navigate = useNavigate()
  const loc = useLocation()

  const initials = profile?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??'
  const primary = org?.primary_color || '#0F766E'

  const navItems = [
    { label: 'Events', path: '/', icon: '📋' },
    { label: 'Settings', path: '/settings', icon: '⚙️' },
  ]

  return (
    <div style={{ fontFamily: font, minHeight: '100vh', background: '#F8FAFC' }}>
      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {org?.logo_url ? (
            <img src={org.logo_url} alt="" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 8, background: primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>S</div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>SignIn</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>{org?.name || 'Organization'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {navItems.map(n => (
              <button key={n.path} onClick={() => navigate(n.path)} style={{
                border: 'none', background: loc.pathname === n.path ? '#F1F5F9' : 'transparent',
                padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 14,
                fontWeight: loc.pathname === n.path ? 600 : 400, color: '#334155', fontFamily: font,
              }}>{n.icon} {n.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{initials}</div>
            <button onClick={signOut} style={{ border: 'none', background: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 13, fontFamily: font }}>Sign out</button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
        {children}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '16px', fontSize: 11, color: '#CBD5E1' }}>
        SignIn v{VERSION}
      </div>
    </div>
  )
}
