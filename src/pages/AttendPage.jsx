import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase, checkSupabaseHealth } from '../lib/supabase'
import { VERSION } from '../lib/version'

const font = "'Plus Jakarta Sans', sans-serif"

// ── Signature Pad ──
function SignaturePad({ onSave, width = 320, height = 150 }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  const getPos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const t = e.touches ? e.touches[0] : e
    return { x: (t.clientX - rect.left) * (width / rect.width), y: (t.clientY - rect.top) * (height / rect.height) }
  }, [width, height])

  function start(e) {
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const p = getPos(e)
    ctx.beginPath(); ctx.moveTo(p.x, p.y)
    setDrawing(true)
  }

  function draw(e) {
    if (!drawing) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const p = getPos(e)
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#0F172A'
    ctx.lineTo(p.x, p.y); ctx.stroke()
    setHasSignature(true)
  }

  function end() { setDrawing(false) }

  function clear() {
    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0, 0, width, height)
    setHasSignature(false)
    onSave(null)
  }

  function save() {
    if (!hasSignature) return null
    return canvasRef.current.toDataURL('image/png')
  }

  // Expose save via parent
  useEffect(() => { onSave(save) }, [hasSignature])

  return (
    <div>
      <div style={{ position: 'relative', border: '2px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
        <canvas ref={canvasRef} width={width} height={height}
          onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={end}
          style={{ display: 'block', width: '100%', cursor: 'crosshair', touchAction: 'none' }} />
        {!hasSignature && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#94A3B8', fontSize: 14, pointerEvents: 'none' }}>Sign here</div>
        )}
      </div>
      {hasSignature && (
        <button type="button" onClick={clear} style={{ marginTop: 6, border: 'none', background: 'none', color: '#94A3B8', fontSize: 12, cursor: 'pointer', fontFamily: font }}>Clear signature</button>
      )}
    </div>
  )
}

// ── Main Attendance Page ──
export default function AttendPage() {
  const { eventCode } = useParams()

  const [event, setEvent] = useState(null)
  const [org, setOrg] = useState(null)
  const [participants, setParticipants] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loadError, setLoadError] = useState('')
  const [loadErrorType, setLoadErrorType] = useState('') // 'paused' | 'rls' | 'notfound' | 'network'
  const [loading, setLoading] = useState(true)

  // Flow state
  const [screen, setScreen] = useState('search')
  const [searchMode, setSearchMode] = useState('name') // 'name' | 'code'
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [day, setDay] = useState('')
  const [sigGetter, setSigGetter] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [lastSub, setLastSub] = useState(null)

  // Walk-in
  const [wiName, setWiName] = useState('')
  const [wiOrg, setWiOrg] = useState('')
  const [wiEmail, setWiEmail] = useState('')
  const [wiPosition, setWiPosition] = useState('')
  const [wiSex, setWiSex] = useState('')

  // Admin
  const [showAdmin, setShowAdmin] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [adminUnlocked, setAdminUnlocked] = useState(false)

  // Counters per day
  const [counters, setCounters] = useState({})

  useEffect(() => { loadEvent() }, [eventCode])

  async function loadEvent() {
    setLoading(true)
    setLoadError('')
    setLoadErrorType('')

    // Step 1: Check if Supabase is reachable
    const health = await checkSupabaseHealth()
    if (!health.ok) {
      if (health.reason === 'timeout' || health.reason === 'network') {
        setLoadError('Database is waking up. This can take 10-15 seconds on free tier. Please wait and refresh.')
        setLoadErrorType('paused')
      } else if (health.reason === 'rls') {
        setLoadError('Database access denied. RLS policies may be missing. Contact the admin.')
        setLoadErrorType('rls')
      } else if (health.reason === 'schema') {
        setLoadError('Database tables not found. Schema may need to be set up.')
        setLoadErrorType('schema')
      } else {
        setLoadError(`Database error: ${health.detail || health.reason}`)
        setLoadErrorType('other')
      }
      setLoading(false)
      return
    }

    // Step 2: Query event by code
    const { data: ev, error: evErr } = await supabase
      .from('events')
      .select('*, organizations(*)')
      .eq('event_code', eventCode)
      .single()

    if (evErr || !ev) {
      setLoadError('Event not found. Check the link and try again.')
      setLoadErrorType('notfound')
      setLoading(false)
      return
    }

    setEvent(ev)
    setOrg(ev.organizations || null)

    // Step 3: Load participants and attendance
    const [pRes, aRes] = await Promise.all([
      supabase.from('participants').select('*').eq('event_id', ev.id).order('code'),
      supabase.from('attendance').select('*').eq('event_id', ev.id),
    ])
    setParticipants(pRes.data || [])
    setAttendance(aRes.data || [])
    updateCounters(aRes.data || [], ev.num_days)
    setLoading(false)
  }

  function updateCounters(att, numDays) {
    const c = {}
    for (let i = 1; i <= numDays; i++) {
      c[`Day ${i}`] = att.filter(a => a.day_label === `Day ${i}`).length
    }
    setCounters(c)
  }

  // Search/filter
  const filtered = query.trim() ? participants.filter(p => {
    const q = query.toLowerCase()
    if (searchMode === 'code') return p.code?.toLowerCase().includes(q)
    return p.name?.toLowerCase().includes(q) || p.organization?.toLowerCase().includes(q)
  }) : participants

  // Check if already signed for a day
  function alreadySigned(pid, dayLabel) {
    return attendance.some(a => a.participant_id === pid && a.day_label === dayLabel)
  }

  // Submit attendance
  async function handleSubmit() {
    if (!selected || !day) return
    setSubmitting(true)
    setSubmitError('')

    // Upload signature if available
    let sigUrl = null
    if (sigGetter && typeof sigGetter === 'function') {
      const dataUrl = sigGetter()
      if (dataUrl) {
        try {
          const blob = await (await fetch(dataUrl)).blob()
          const path = `${event.id}/${selected.id}_${day.replace(/\s/g, '')}_${Date.now()}.png`
          const { error: upErr } = await supabase.storage.from('signatures').upload(path, blob, { contentType: 'image/png' })
          if (!upErr) {
            const { data: urlData } = supabase.storage.from('signatures').getPublicUrl(path)
            sigUrl = urlData.publicUrl
          }
        } catch (e) { console.warn('Signature upload failed:', e) }
      }
    }

    const { error } = await supabase.from('attendance').insert({
      event_id: event.id, participant_id: selected.id, day_label: day,
      signature_url: sigUrl, signed_at: new Date().toISOString(),
    })

    if (error) {
      setSubmitError(error.message)
      setSubmitting(false)
      return
    }

    setLastSub({ name: selected.name, day })
    const newAtt = [...attendance, { participant_id: selected.id, day_label: day, signature_url: sigUrl }]
    setAttendance(newAtt)
    updateCounters(newAtt, event.num_days)
    setScreen('success')
    setSubmitting(false)
  }

  // Walk-in submit
  async function handleWalkin(e) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError('')

    const maxCode = participants.reduce((max, p) => Math.max(max, parseInt(p.code?.replace(/\D/g, '') || '0')), 0)
    const newCode = `W${String(maxCode + 1).padStart(3, '0')}`

    const { data: newP, error: pErr } = await supabase.from('participants').insert({
      event_id: event.id, code: newCode, name: wiName, organization: wiOrg,
      email: wiEmail, position: wiPosition, sex: wiSex, is_walkin: true,
    }).select().single()

    if (pErr) { setSubmitError(pErr.message); setSubmitting(false); return }

    setParticipants([...participants, newP])
    setSelected(newP)
    setWiName(''); setWiOrg(''); setWiEmail(''); setWiPosition(''); setWiSex('')
    setScreen('confirm')
    setSubmitting(false)
  }

  // Reset to search
  function resetToSearch() {
    setScreen('search'); setSelected(null); setDay(''); setQuery('')
    setSigGetter(null); setSubmitError(''); setLastSub(null)
  }

  // Branding
  const C = {
    primary: org?.primary_color || '#0F766E',
    secondary: org?.secondary_color || '#F0FDFA',
    accent: org?.accent_color || '#134E4A',
    bg: '#F8FAFC', surface: '#fff', text: '#0F172A', text2: '#475569',
    muted: '#64748B', light: '#94A3B8', border: '#E2E8F0', red: '#DC2626',
    primaryLight: '#F0FDFA',
  }

  const btnRadius = org?.button_style === 'pill' ? 24 : org?.button_style === 'square' ? 4 : 10
  const cardStyle = { background: C.surface, borderRadius: 14, padding: 20, margin: '14px', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }
  const inputStyle = { width: '100%', padding: '12px 14px', border: `2px solid ${C.border}`, borderRadius: btnRadius, fontSize: 16, fontFamily: font, outline: 'none', boxSizing: 'border-box' }

  // ── Loading screen ──
  if (loading) {
    return (
      <div style={{ fontFamily: font, maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: C.bg }}>
        <div style={{ background: C.primary, padding: '20px', color: '#fff', textAlign: 'center', fontWeight: 700, fontSize: 18 }}>Loading...</div>
        <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Connecting to database...</div>
      </div>
    )
  }

  // ── Error screen with diagnostics ──
  if (loadError) {
    return (
      <div style={{ fontFamily: font, maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: C.bg }}>
        <div style={{ background: C.primary, padding: '16px 20px', color: '#fff', fontSize: 20, fontWeight: 700 }}>SignIn</div>
        <div style={cardStyle}>
          <p style={{ color: C.red, textAlign: 'center', fontWeight: 600, margin: '0 0 12px' }}>
            {loadErrorType === 'paused' ? '⏳ Database is sleeping' : loadErrorType === 'notfound' ? '🔍 Event not found' : '⚠️ Connection issue'}
          </p>
          <p style={{ color: C.text2, textAlign: 'center', fontSize: 14, margin: 0 }}>{loadError}</p>
          {loadErrorType === 'paused' && (
            <p style={{ color: C.light, textAlign: 'center', fontSize: 12, marginTop: 8 }}>
              Supabase free tier pauses after inactivity. Open your Supabase dashboard to resume the project, then refresh this page.
            </p>
          )}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={loadEvent} style={{
              border: 'none', background: C.primary, color: '#fff', padding: '10px 24px',
              borderRadius: btnRadius, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: font,
            }}>Retry</button>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: 16, fontSize: 11, color: C.light }}>SignIn v{VERSION}</div>
      </div>
    )
  }

  // ── Main attend UI ──
  return (
    <div style={{ fontFamily: font, maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: C.bg }}>
      {/* Header */}
      <div style={{ background: C.primary, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {org?.logo_url && <img src={org.logo_url} alt="" style={{ height: 36, objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />}
        {org?.banner_url ? (
          <img src={org.banner_url} alt="" style={{ height: 40, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none' }} />
        ) : (
          <div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{org?.name || 'SignIn'}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{event.name}</div>
          </div>
        )}
      </div>

      {/* Day counters */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 14px' }}>
        <div style={{ flex: 1, background: C.surface, borderRadius: 10, padding: '10px 8px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{participants.length}</div>
          <div style={{ fontSize: 11, color: C.text2 }}>Registered</div>
        </div>
        {Object.entries(counters).map(([dayLabel, count]) => (
          <div key={dayLabel} style={{ flex: 1, background: C.surface, borderRadius: 10, padding: '10px 8px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{count}</div>
            <div style={{ fontSize: 11, color: C.text2 }}>{dayLabel}</div>
          </div>
        ))}
      </div>

      {/* ── SEARCH SCREEN ── */}
      {screen === 'search' && (
        <div style={cardStyle}>
          {/* Search mode toggle */}
          <div style={{ display: 'flex', marginBottom: 12, background: '#F1F5F9', borderRadius: btnRadius, overflow: 'hidden' }}>
            <button onClick={() => { setSearchMode('name'); setQuery('') }} style={{
              flex: 1, border: 'none', padding: '10px', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: font,
              background: searchMode === 'name' ? C.primary : 'transparent',
              color: searchMode === 'name' ? '#fff' : C.muted,
            }}>By Name</button>
            <button onClick={() => { setSearchMode('code'); setQuery('') }} style={{
              flex: 1, border: 'none', padding: '10px', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: font,
              background: searchMode === 'code' ? C.primary : 'transparent',
              color: searchMode === 'code' ? '#fff' : C.muted,
            }}>By Code</button>
          </div>

          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={searchMode === 'code' ? 'Enter your code...' : 'Search name or organization...'}
            style={inputStyle}
            autoFocus
          />

          {/* Find Me shortcut */}
          {searchMode === 'code' && query.length >= 2 && filtered.length === 1 && (
            <button onClick={() => { setSelected(filtered[0]); setScreen('confirm') }} style={{
              width: '100%', marginTop: 10, border: `2px solid ${C.primary}`, background: C.secondary,
              color: C.primary, padding: '12px', borderRadius: btnRadius, fontWeight: 700, fontSize: 15,
              cursor: 'pointer', fontFamily: font,
            }}>✨ I'm {filtered[0].name} — Sign In</button>
          )}

          {/* Results */}
          {query.trim() && (
            <div style={{ marginTop: 12, maxHeight: 300, overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <p style={{ color: C.light, textAlign: 'center', fontSize: 14 }}>No matches found</p>
              ) : (
                filtered.map(p => (
                  <div key={p.id} onClick={() => { setSelected(p); setScreen('confirm') }} style={{
                    padding: '12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                    border: `1px solid ${C.border}`, transition: 'background 0.1s',
                  }} onMouseOver={e => e.currentTarget.style.background = C.secondary}
                     onMouseOut={e => e.currentTarget.style.background = '#fff'}>
                    <div style={{ fontWeight: 600, color: C.text }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{p.code}{p.organization ? ` • ${p.organization}` : ''}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Walk-in button */}
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button onClick={() => setScreen('walkin')} style={{
              border: `1.5px solid ${C.border}`, background: 'none', padding: '10px 20px',
              borderRadius: btnRadius, fontSize: 14, fontWeight: 600, color: C.text2, fontFamily: font, cursor: 'pointer',
            }}>Walk-in registration</button>
          </div>
        </div>
      )}

      {/* ── CONFIRM SCREEN ── */}
      {screen === 'confirm' && selected && (
        <div style={cardStyle}>
          <button onClick={resetToSearch} style={{ border: 'none', background: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, fontFamily: font, padding: 0, marginBottom: 12 }}>← Back to search</button>

          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{selected.name}</div>
            <div style={{ fontSize: 13, color: C.muted }}>{selected.code}{selected.organization ? ` • ${selected.organization}` : ''}</div>
          </div>

          {/* Day picker */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>Select day</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {Array.from({ length: event.num_days }, (_, i) => {
                const d = `Day ${i + 1}`
                const done = alreadySigned(selected.id, d)
                const active = day === d
                return (
                  <button key={d} type="button" disabled={done} onClick={() => setDay(d)} style={{
                    flex: 1, padding: '10px 8px', borderRadius: btnRadius,
                    border: active ? `2px solid ${C.primary}` : `2px solid ${C.border}`,
                    background: done ? '#F1F5F9' : active ? C.secondary : '#fff',
                    color: done ? C.light : active ? C.primary : C.text,
                    fontWeight: 600, fontSize: 14, cursor: done ? 'not-allowed' : 'pointer',
                    fontFamily: font, opacity: done ? 0.6 : 1,
                  }}>{d}{done ? ' ✓' : ''}</button>
                )
              })}
            </div>
          </div>

          {/* Signature */}
          {day && (
            <>
              <div style={{ marginBottom: 6, fontSize: 12, fontWeight: 600, color: C.muted }}>Signature</div>
              <SignaturePad onSave={fn => setSigGetter(() => fn)} />

              {submitError && <p style={{ color: C.red, fontSize: 13, marginTop: 8 }}>{submitError}</p>}

              <button onClick={handleSubmit} disabled={submitting} style={{
                width: '100%', marginTop: 16, border: 'none', background: C.primary, color: '#fff',
                padding: '14px', borderRadius: btnRadius, fontWeight: 700, fontSize: 16,
                cursor: submitting ? 'wait' : 'pointer', fontFamily: font, opacity: submitting ? 0.7 : 1,
              }}>{submitting ? 'Submitting...' : 'Submit attendance'}</button>
            </>
          )}
        </div>
      )}

      {/* ── SUCCESS SCREEN ── */}
      {screen === 'success' && lastSub && (
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Attendance recorded</div>
            <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>{lastSub.name} — {lastSub.day}</div>
            <button onClick={resetToSearch} style={{
              marginTop: 20, border: 'none', background: C.primary, color: '#fff',
              padding: '12px 32px', borderRadius: btnRadius, fontWeight: 600, fontSize: 15,
              cursor: 'pointer', fontFamily: font,
            }}>Next participant</button>
          </div>
        </div>
      )}

      {/* ── WALK-IN SCREEN ── */}
      {screen === 'walkin' && (
        <div style={cardStyle}>
          <button onClick={resetToSearch} style={{ border: 'none', background: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, fontFamily: font, padding: 0, marginBottom: 12 }}>← Back to search</button>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: C.text }}>Walk-in registration</h3>

          <form onSubmit={handleWalkin}>
            <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
              <input value={wiName} onChange={e => setWiName(e.target.value)} required placeholder="Full name *" style={inputStyle} />
              <input value={wiOrg} onChange={e => setWiOrg(e.target.value)} placeholder="Organization" style={inputStyle} />
              <input value={wiEmail} onChange={e => setWiEmail(e.target.value)} placeholder="Email" style={inputStyle} />
              <input value={wiPosition} onChange={e => setWiPosition(e.target.value)} placeholder="Position" style={inputStyle} />
              <select value={wiSex} onChange={e => setWiSex(e.target.value)} style={inputStyle}>
                <option value="">Sex</option><option>Male</option><option>Female</option>
              </select>
            </div>

            {submitError && <p style={{ color: C.red, fontSize: 13 }}>{submitError}</p>}

            <button type="submit" disabled={submitting} style={{
              width: '100%', border: 'none', background: C.primary, color: '#fff',
              padding: '14px', borderRadius: btnRadius, fontWeight: 700, fontSize: 16,
              cursor: submitting ? 'wait' : 'pointer', fontFamily: font,
            }}>{submitting ? 'Registering...' : 'Register & continue to sign-in'}</button>
          </form>
        </div>
      )}

      {/* Admin section */}
      <div style={{ padding: '8px 14px' }}>
        {!showAdmin ? (
          <button onClick={() => setShowAdmin(true)} style={{
            border: 'none', background: 'none', color: C.light, fontSize: 12, cursor: 'pointer', fontFamily: font,
          }}>Admin</button>
        ) : !adminUnlocked ? (
          <div style={{ ...cardStyle, margin: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text2, marginBottom: 8 }}>Enter admin PIN</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={pinInput} onChange={e => setPinInput(e.target.value)} type="password" maxLength={6} placeholder="PIN" style={{ ...inputStyle, width: 120 }} />
              <button onClick={() => {
                if (org?.admin_pin && pinInput === org.admin_pin) setAdminUnlocked(true)
                else { setPinInput(''); alert('Incorrect PIN') }
              }} style={{
                border: 'none', background: C.primary, color: '#fff', padding: '10px 16px',
                borderRadius: btnRadius, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: font,
              }}>Unlock</button>
              <button onClick={() => { setShowAdmin(false); setPinInput('') }} style={{
                border: `1px solid ${C.border}`, background: '#fff', color: C.muted, padding: '10px 16px',
                borderRadius: btnRadius, fontSize: 13, cursor: 'pointer', fontFamily: font,
              }}>Cancel</button>
            </div>
            {!org?.admin_pin && <p style={{ fontSize: 11, color: C.light, marginTop: 6 }}>No admin PIN set. Configure one in Settings.</p>}
          </div>
        ) : (
          <div style={{ ...cardStyle, margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Admin panel</div>
              <button onClick={() => { setAdminUnlocked(false); setShowAdmin(false); setPinInput('') }} style={{
                border: 'none', background: 'none', color: C.muted, fontSize: 12, cursor: 'pointer', fontFamily: font,
              }}>Lock</button>
            </div>
            <div style={{ fontSize: 13, color: C.text2 }}>
              <p style={{ margin: '0 0 6px' }}><strong>Event:</strong> {event.name}</p>
              <p style={{ margin: '0 0 6px' }}><strong>Code:</strong> {event.event_code}</p>
              <p style={{ margin: '0 0 6px' }}><strong>Participants:</strong> {participants.length}</p>
              <p style={{ margin: '0 0 6px' }}><strong>Attendance records:</strong> {attendance.length}</p>
              <p style={{ margin: 0 }}><strong>Admin link:</strong> <a href={`${window.location.origin}/events/${event.id}`} target="_blank" rel="noopener" style={{ color: C.primary, fontSize: 12 }}>Open admin</a></p>
            </div>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', padding: 16, fontSize: 11, color: C.light }}>SignIn v{VERSION}</div>
    </div>
  )
}
