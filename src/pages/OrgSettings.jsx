import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

const PRESETS = [
  { name: 'Teal', primary: '#0F766E', secondary: '#F0FDFA' },
  { name: 'Navy', primary: '#1E3A5F', secondary: '#EFF6FF' },
  { name: 'Orange', primary: '#EA580C', secondary: '#FFF7ED' },
  { name: 'Forest', primary: '#15803D', secondary: '#F0FDF4' },
  { name: 'Crimson', primary: '#B91C1C', secondary: '#FEF2F2' },
  { name: 'Purple', primary: '#7C3AED', secondary: '#F5F3FF' },
  { name: 'Slate', primary: '#334155', secondary: '#F8FAFC' },
  { name: 'MCF Orange', primary: '#F37021', secondary: '#FFF4EC' },
]

export default function OrgSettings() {
  const { org, user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef()

  const [orgName, setOrgName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#0F766E')
  const [secondaryColor, setSecondaryColor] = useState('#F0FDFA')
  const [logoUrl, setLogoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!org) return
    setOrgName(org.name || '')
    setPrimaryColor(org.primary_color || '#0F766E')
    setSecondaryColor(org.secondary_color || '#F0FDFA')
    setLogoUrl(org.logo_url || '')
  }, [org])

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, SVG).')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be under 2MB.')
      return
    }

    setUploading(true)
    setError('')

    const ext = file.name.split('.').pop()
    const path = `${org.id}/logo_${Date.now()}.${ext}`

    // Delete old logo if exists
    if (logoUrl) {
      const oldPath = logoUrl.split('/logos/')[1]
      if (oldPath) await supabase.storage.from('logos').remove([oldPath])
    }

    const { error: uploadErr } = await supabase.storage
      .from('logos')
      .upload(path, file, { contentType: file.type, upsert: true })

    if (uploadErr) {
      setError(`Upload failed: ${uploadErr.message}`)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(path)
    const newUrl = data?.publicUrl || ''
    setLogoUrl(newUrl)

    // Save immediately
    await supabase.from('organizations').update({ logo_url: newUrl }).eq('id', org.id)
    setUploading(false)
    setSuccess('Logo uploaded.')
    setTimeout(() => setSuccess(''), 2000)
    refreshProfile()
  }

  async function removeLogo() {
    if (!logoUrl) return
    const oldPath = logoUrl.split('/logos/')[1]
    if (oldPath) await supabase.storage.from('logos').remove([oldPath])
    await supabase.from('organizations').update({ logo_url: null }).eq('id', org.id)
    setLogoUrl('')
    refreshProfile()
  }

  function applyPreset(preset) {
    setPrimaryColor(preset.primary)
    setSecondaryColor(preset.secondary)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!orgName.trim()) { setError('Organization name is required.'); return }
    setSaving(true)
    setError('')
    setSuccess('')

    const { error: err } = await supabase.from('organizations').update({
      name: orgName.trim(),
      primary_color: primaryColor,
      secondary_color: secondaryColor,
    }).eq('id', org.id)

    if (err) { setError(err.message) }
    else {
      setSuccess('Settings saved.')
      refreshProfile()
      setTimeout(() => setSuccess(''), 2000)
    }
    setSaving(false)
  }

  if (!org) return null

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <button className="btn btn-secondary btn-sm mb-4" onClick={() => navigate('/')}>← Back</button>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Organization settings</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Logo */}
      <div className="card card-pad mb-4">
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Logo</h3>
        <p className="text-sm text-muted mb-4">Shown on your attendance page header. PNG, JPG, or SVG under 2MB.</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {logoUrl ? (
            <div style={{
              width: 80, height: 80, borderRadius: 12,
              border: '1px solid var(--border)', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#fff',
            }}>
              <img src={logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
          ) : (
            <div style={{
              width: 80, height: 80, borderRadius: 12,
              border: '2px dashed var(--border)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-3)', fontSize: 12,
            }}>No logo</div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
              {uploading ? 'Uploading...' : logoUrl ? 'Replace' : 'Upload logo'}
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
            </label>
            {logoUrl && (
              <button className="btn btn-secondary btn-sm" onClick={removeLogo}>Remove</button>
            )}
          </div>
        </div>
      </div>

      {/* Name + Colors */}
      <div className="card card-pad mb-4">
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Organization name</label>
            <input className="form-input" value={orgName} onChange={e => setOrgName(e.target.value)} required />
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, marginTop: 20 }}>Brand colors</h3>
          <p className="text-sm text-muted mb-4">Applied to the tablet attendance page: header, buttons, and accents.</p>

          {/* Presets */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {PRESETS.map(p => (
              <button key={p.name} type="button" onClick={() => applyPreset(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 6, border: `1.5px solid ${primaryColor === p.primary ? p.primary : 'var(--border)'}`,
                  background: primaryColor === p.primary ? p.secondary : 'var(--surface)',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  color: primaryColor === p.primary ? p.primary : 'var(--text-2)',
                  fontFamily: 'var(--font)',
                }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, background: p.primary, display: 'inline-block' }} />
                {p.name}
              </button>
            ))}
          </div>

          {/* Custom color pickers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label className="form-label">Primary color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                  style={{ width: 40, height: 36, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                <input className="form-input" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: 13 }} maxLength={7} />
              </div>
            </div>
            <div>
              <label className="form-label">Background tint</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                  style={{ width: 40, height: 36, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                <input className="form-input" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: 13 }} maxLength={7} />
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div style={{ marginBottom: 20 }}>
            <label className="form-label">Preview</label>
            <div style={{
              borderRadius: 12, overflow: 'hidden',
              border: '1px solid var(--border)', maxWidth: 320,
            }}>
              <div style={{
                background: primaryColor, padding: '14px 16px', color: '#fff',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                {logoUrl && (
                  <img src={logoUrl} alt="" style={{ height: 28, borderRadius: 4, background: 'rgba(255,255,255,.15)', padding: 2 }} />
                )}
                <div>
                  <div style={{ fontSize: 10, opacity: .7, letterSpacing: 1, textTransform: 'uppercase' }}>{orgName || 'Your Org'}</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>Sample Event</div>
                </div>
              </div>
              <div style={{ background: '#F1F5F9', padding: 12 }}>
                <div style={{
                  background: '#fff', borderRadius: 10, padding: 14,
                  boxShadow: '0 1px 4px rgba(0,0,0,.04)',
                }}>
                  <div style={{
                    width: '100%', padding: '8px 12px', border: '2px solid #E2E8F0',
                    borderRadius: 8, fontSize: 13, color: '#94A3B8',
                  }}>Search name or code...</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <span style={{
                      flex: 1, padding: '8px', borderRadius: 6, textAlign: 'center',
                      fontSize: 12, fontWeight: 600,
                      background: secondaryColor, color: primaryColor,
                      border: `2px solid ${primaryColor}`,
                    }}>Day 1</span>
                    <span style={{
                      flex: 1, padding: '8px', borderRadius: 6, textAlign: 'center',
                      fontSize: 12, fontWeight: 600, color: '#94A3B8',
                      border: '2px solid #E2E8F0',
                    }}>Day 2</span>
                  </div>
                  <div style={{
                    marginTop: 10, padding: '10px', borderRadius: 6,
                    background: primaryColor, color: '#fff', textAlign: 'center',
                    fontSize: 13, fontWeight: 600,
                  }}>Confirm attendance</div>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </form>
      </div>
    </div>
  )
}
