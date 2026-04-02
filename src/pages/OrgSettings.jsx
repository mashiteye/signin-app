import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

const PRESETS = [
  { name: 'Teal', primary: '#0F766E', secondary: '#F0FDFA', accent: '#F59E0B' },
  { name: 'Navy', primary: '#1E3A5F', secondary: '#EFF6FF', accent: '#3B82F6' },
  { name: 'Orange', primary: '#EA580C', secondary: '#FFF7ED', accent: '#16A34A' },
  { name: 'Forest', primary: '#15803D', secondary: '#F0FDF4', accent: '#EAB308' },
  { name: 'Crimson', primary: '#B91C1C', secondary: '#FEF2F2', accent: '#F59E0B' },
  { name: 'Purple', primary: '#7C3AED', secondary: '#F5F3FF', accent: '#EC4899' },
  { name: 'Slate', primary: '#334155', secondary: '#F8FAFC', accent: '#0EA5E9' },
  { name: 'MCF Orange', primary: '#F37021', secondary: '#FFF4EC', accent: '#8DB92E' },
]

export default function OrgSettings() {
  const { org, user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const logoRef = useRef()
  const bannerRef = useRef()

  const [orgName, setOrgName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#0F766E')
  const [secondaryColor, setSecondaryColor] = useState('#F0FDFA')
  const [accentColor, setAccentColor] = useState('#F59E0B')
  const [logoUrl, setLogoUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [adminPin, setAdminPin] = useState('1234')
  const [buttonStyle, setButtonStyle] = useState('rounded')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!org) return
    setOrgName(org.name || '')
    setPrimaryColor(org.primary_color || '#0F766E')
    setSecondaryColor(org.secondary_color || '#F0FDFA')
    setAccentColor(org.accent_color || '#F59E0B')
    setLogoUrl(org.logo_url || '')
    setBannerUrl(org.banner_url || '')
    setAdminPin(org.admin_pin || '1234')
    setButtonStyle(org.button_style || 'rounded')
  }, [org])

  async function uploadImage(file, prefix) {
    if (!file.type.startsWith('image/')) throw new Error('Upload an image file.')
    if (file.size > 5 * 1024 * 1024) throw new Error('Image must be under 5MB.')
    const ext = file.name.split('.').pop()
    const path = `${org.id}/${prefix}_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('logos').upload(path, file, { contentType: file.type, upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('logos').getPublicUrl(path)
    return data?.publicUrl || ''
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    try {
      const url = await uploadImage(file, 'logo')
      setLogoUrl(url)
      await supabase.from('organizations').update({ logo_url: url }).eq('id', org.id)
      setSuccess('Logo uploaded.'); setTimeout(() => setSuccess(''), 2000)
      refreshProfile()
    } catch (err) { setError(err.message) }
    setUploading(false)
  }

  async function handleBannerUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    try {
      const url = await uploadImage(file, 'banner')
      setBannerUrl(url)
      await supabase.from('organizations').update({ banner_url: url }).eq('id', org.id)
      setSuccess('Banner uploaded.'); setTimeout(() => setSuccess(''), 2000)
      refreshProfile()
    } catch (err) { setError(err.message) }
    setUploading(false)
  }

  async function removeImage(type) {
    const url = type === 'logo' ? logoUrl : bannerUrl
    if (!url) return
    const oldPath = url.split('/logos/')[1]
    if (oldPath) await supabase.storage.from('logos').remove([oldPath])
    await supabase.from('organizations').update({ [type === 'logo' ? 'logo_url' : 'banner_url']: null }).eq('id', org.id)
    type === 'logo' ? setLogoUrl('') : setBannerUrl('')
    refreshProfile()
  }

  function applyPreset(p) { setPrimaryColor(p.primary); setSecondaryColor(p.secondary); setAccentColor(p.accent) }

  const btnRadius = buttonStyle === 'pill' ? '999px' : buttonStyle === 'square' ? '4px' : '10px'

  async function handleSave(e) {
    e.preventDefault()
    if (!orgName.trim()) { setError('Organization name is required.'); return }
    setSaving(true); setError(''); setSuccess('')
    const { error: err } = await supabase.from('organizations').update({
      name: orgName.trim(), primary_color: primaryColor, secondary_color: secondaryColor,
      accent_color: accentColor, admin_pin: adminPin, button_style: buttonStyle,
    }).eq('id', org.id)
    if (err) setError(err.message)
    else { setSuccess('Settings saved.'); refreshProfile(); setTimeout(() => setSuccess(''), 2000) }
    setSaving(false)
  }

  if (!org) return null

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <button className="btn btn-secondary btn-sm mb-4" onClick={() => navigate('/')}>← Back</button>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Organization settings</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* ── BRANDING IMAGES ── */}
      <div className="card card-pad mb-4">
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Branding images</h3>
        <p className="text-sm text-muted mb-4">Shown on your tablet attendance page. PNG, JPG, or SVG under 5MB.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Logo */}
          <div>
            <label className="form-label">Logo</label>
            <p className="text-sm text-light" style={{ marginBottom: 8 }}>Square or horizontal. Shows in header.</p>
            {logoUrl ? (
              <div style={{ width: 100, height: 100, borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', marginBottom: 8 }}>
                <img src={logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ width: 100, height: 100, borderRadius: 12, border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 11, marginBottom: 8 }}>No logo</div>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
                {logoUrl ? 'Replace' : 'Upload'}
                <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
              </label>
              {logoUrl && <button className="btn btn-secondary btn-sm" onClick={() => removeImage('logo')}>Remove</button>}
            </div>
          </div>

          {/* Banner */}
          <div>
            <label className="form-label">Banner image</label>
            <p className="text-sm text-light" style={{ marginBottom: 8 }}>Wide image for the header background.</p>
            {bannerUrl ? (
              <div style={{ width: '100%', height: 100, borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 8 }}>
                <img src={bannerUrl} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{ width: '100%', height: 100, borderRadius: 12, border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 11, marginBottom: 8 }}>No banner</div>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
                {bannerUrl ? 'Replace' : 'Upload'}
                <input ref={bannerRef} type="file" accept="image/*" onChange={handleBannerUpload} style={{ display: 'none' }} />
              </label>
              {bannerUrl && <button className="btn btn-secondary btn-sm" onClick={() => removeImage('banner')}>Remove</button>}
            </div>
          </div>
        </div>
      </div>

      {/* ── COLORS ── */}
      <div className="card card-pad mb-4">
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Organization name</label>
            <input className="form-input" value={orgName} onChange={e => setOrgName(e.target.value)} required />
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, marginTop: 20 }}>Brand colors</h3>
          <p className="text-sm text-muted mb-4">Applied to the tablet attendance page.</p>

          {/* Presets */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {PRESETS.map(p => (
              <button key={p.name} type="button" onClick={() => applyPreset(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6,
                  border: `1.5px solid ${primaryColor === p.primary ? p.primary : 'var(--border)'}`,
                  background: primaryColor === p.primary ? p.secondary : 'var(--surface)',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  color: primaryColor === p.primary ? p.primary : 'var(--text-2)', fontFamily: 'var(--font)',
                }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: p.primary }} />
                <span style={{ width: 12, height: 12, borderRadius: 3, background: p.accent }} />
                {p.name}
              </button>
            ))}
          </div>

          {/* Color pickers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
            <ColorPicker label="Primary" value={primaryColor} onChange={setPrimaryColor} hint="Header, buttons" />
            <ColorPicker label="Background tint" value={secondaryColor} onChange={setSecondaryColor} hint="Selected states" />
            <ColorPicker label="Accent" value={accentColor} onChange={setAccentColor} hint="Counters, highlights" />
          </div>

          {/* ── BUTTON STYLE ── */}
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, marginTop: 20 }}>Button style</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[['rounded', '10px'], ['pill', '999px'], ['square', '4px']].map(([name, rad]) => (
              <button key={name} type="button" onClick={() => setButtonStyle(name)} style={{
                padding: '8px 20px', borderRadius: rad, fontWeight: 600, fontSize: 13,
                border: buttonStyle === name ? `2px solid ${primaryColor}` : '2px solid var(--border)',
                background: buttonStyle === name ? secondaryColor : 'var(--surface)',
                color: buttonStyle === name ? primaryColor : 'var(--text-2)',
                cursor: 'pointer', fontFamily: 'var(--font)', textTransform: 'capitalize',
              }}>{name}</button>
            ))}
          </div>

          {/* ── ADMIN PIN ── */}
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, marginTop: 20 }}>Tablet admin PIN</h3>
          <p className="text-sm text-muted mb-2">Required to access edit/admin features on the tablet attendance page.</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20 }}>
            <input className="form-input" value={adminPin} onChange={e => setAdminPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="4-6 digit PIN" maxLength={6} style={{ maxWidth: 140, fontFamily: 'monospace', fontSize: 18, letterSpacing: 4, textAlign: 'center' }} />
            <span className="text-sm text-light">4-6 digits</span>
          </div>

          {/* ── LIVE PREVIEW ── */}
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, marginTop: 20 }}>Live preview</h3>
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', maxWidth: 360, boxShadow: '0 4px 20px rgba(0,0,0,.08)' }}>
            {/* Banner or color header */}
            {bannerUrl ? (
              <div style={{ position: 'relative' }}>
                <img src={bannerUrl} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '30px 16px 12px', background: 'linear-gradient(transparent, rgba(0,0,0,.7))', color: '#fff' }}>
                  {logoUrl && <img src={logoUrl} alt="" style={{ height: 28, borderRadius: 4, marginBottom: 6, display: 'block' }} />}
                  <div style={{ fontSize: 10, opacity: .8, letterSpacing: 1, textTransform: 'uppercase' }}>{orgName || 'Your Org'}</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Sample Event</div>
                </div>
              </div>
            ) : (
              <div style={{ background: primaryColor, padding: '14px 16px', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                {logoUrl && <img src={logoUrl} alt="" style={{ height: 32, borderRadius: 4, background: 'rgba(255,255,255,.15)', padding: 2 }} />}
                <div>
                  <div style={{ fontSize: 10, opacity: .7, letterSpacing: 1, textTransform: 'uppercase' }}>{orgName || 'Your Org'}</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Sample Event</div>
                  <div style={{ fontSize: 11, opacity: .6 }}>24 participants</div>
                </div>
              </div>
            )}

            {/* Counters */}
            <div style={{ display: 'flex', gap: 6, padding: '10px 12px' }}>
              {['Day 1', 'Day 2', 'Walk-ins'].map((d, i) => (
                <div key={d} style={{ flex: 1, background: '#fff', borderRadius: 8, padding: '8px 6px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: i < 2 ? primaryColor : accentColor }}>{[12, 8, 3][i]}</div>
                  <div style={{ fontSize: 10, color: '#64748B' }}>{d}</div>
                </div>
              ))}
            </div>

            {/* Search area */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 14, margin: '0 12px 12px', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
              {/* Toggle */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 10, borderRadius: btnRadius, overflow: 'hidden', border: `1.5px solid ${primaryColor}` }}>
                <div style={{ flex: 1, padding: '7px', textAlign: 'center', fontSize: 12, fontWeight: 600, background: secondaryColor, color: primaryColor }}>By Code</div>
                <div style={{ flex: 1, padding: '7px', textAlign: 'center', fontSize: 12, fontWeight: 600, background: '#fff', color: '#94A3B8' }}>By Name</div>
              </div>
              <div style={{ padding: '9px 12px', border: '2px solid #E2E8F0', borderRadius: 8, fontSize: 13, color: '#94A3B8', marginBottom: 10 }}>
                Enter participant code...
              </div>
              <div style={{ padding: '10px', borderRadius: btnRadius, background: primaryColor, color: '#fff', textAlign: 'center', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Find Me
              </div>
              <div style={{ padding: '10px', borderRadius: btnRadius, background: accentColor, color: '#fff', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>
                Walk-in Registration
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg mt-6" disabled={saving}>
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </form>
      </div>
    </div>
  )
}

function ColorPicker({ label, value, onChange, hint }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {hint && <p className="text-sm text-light" style={{ marginBottom: 4 }}>{hint}</p>}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 36, height: 32, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: 1 }} />
        <input className="form-input" value={value} onChange={e => onChange(e.target.value)}
          style={{ fontFamily: 'monospace', fontSize: 12, padding: '6px 8px' }} maxLength={7} />
      </div>
    </div>
  )
}
