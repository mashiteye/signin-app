import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

const font = "'Plus Jakarta Sans', sans-serif"

export default function OrgSettings() {
  const { org, loadProfile } = useAuth()
  const [name, setName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#0F766E')
  const [secondaryColor, setSecondaryColor] = useState('#F0FDFA')
  const [accentColor, setAccentColor] = useState('#134E4A')
  const [logoUrl, setLogoUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [buttonStyle, setButtonStyle] = useState('rounded')
  const [adminPin, setAdminPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (org) {
      setName(org.name || '')
      setPrimaryColor(org.primary_color || '#0F766E')
      setSecondaryColor(org.secondary_color || '#F0FDFA')
      setAccentColor(org.accent_color || '#134E4A')
      setLogoUrl(org.logo_url || '')
      setBannerUrl(org.banner_url || '')
      setButtonStyle(org.button_style || 'rounded')
      setAdminPin(org.admin_pin || '')
    }
  }, [org])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    const { error } = await supabase.from('organizations').update({
      name, primary_color: primaryColor, secondary_color: secondaryColor,
      accent_color: accentColor, logo_url: logoUrl, banner_url: bannerUrl,
      button_style: buttonStyle, admin_pin: adminPin,
    }).eq('id', org.id)
    if (error) setMsg(`Error: ${error.message}`)
    else { setMsg('Settings saved'); loadProfile() }
    setSaving(false)
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', border: '2px solid #E2E8F0', borderRadius: 8,
    fontSize: 14, fontFamily: font, outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700, color: '#0F172A' }}>Organization settings</h1>

      {msg && (
        <div style={{ background: msg.startsWith('Error') ? '#FEF2F2' : '#F0FDF4', color: msg.startsWith('Error') ? '#DC2626' : '#166534', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{msg}</div>
      )}

      <form onSubmit={handleSave}>
        {/* General */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 16, border: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>General</h3>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Organization name</label>
            <input value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Admin PIN (for tablet admin access)</label>
            <input value={adminPin} onChange={e => setAdminPin(e.target.value)} style={{ ...inputStyle, width: 120 }} placeholder="e.g. 1234" maxLength={6} />
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Used on the tablet attend page to access admin features. Leave blank to disable.</div>
          </div>
        </div>

        {/* Branding */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 16, border: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Branding</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Primary color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ width: 36, height: 36, border: 'none', cursor: 'pointer' }} />
                <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} style={{ ...inputStyle, fontSize: 12 }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Secondary color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} style={{ width: 36, height: 36, border: 'none', cursor: 'pointer' }} />
                <input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} style={{ ...inputStyle, fontSize: 12 }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Accent color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ width: 36, height: 36, border: 'none', cursor: 'pointer' }} />
                <input value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ ...inputStyle, fontSize: 12 }} />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Logo URL</label>
            <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} style={inputStyle} placeholder="https://example.com/logo.png" />
            {logoUrl && <img src={logoUrl} alt="Logo preview" style={{ height: 40, marginTop: 8, objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Banner URL (attend page header)</label>
            <input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} style={inputStyle} placeholder="https://example.com/banner.png" />
          </div>

          <div>
            <label style={labelStyle}>Button style</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['rounded', 'pill', 'square'].map(s => (
                <button key={s} type="button" onClick={() => setButtonStyle(s)} style={{
                  border: `2px solid ${buttonStyle === s ? primaryColor : '#E2E8F0'}`,
                  background: buttonStyle === s ? secondaryColor : '#fff',
                  padding: '8px 16px', borderRadius: s === 'pill' ? 20 : s === 'square' ? 2 : 8,
                  fontSize: 13, cursor: 'pointer', fontFamily: font, fontWeight: 600,
                  color: buttonStyle === s ? primaryColor : '#64748B',
                }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
              ))}
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} style={{
          border: 'none', borderRadius: 10, background: primaryColor, color: '#fff',
          padding: '12px 32px', fontSize: 15, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', fontFamily: font,
        }}>{saving ? 'Saving...' : 'Save settings'}</button>
      </form>
    </div>
  )
}
