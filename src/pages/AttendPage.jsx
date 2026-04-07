import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ── Signature Pad ──
function SignaturePad({ onSave, onClear, primaryColor }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasSig, setHasSig] = useState(false)
  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    c.width = c.parentElement.offsetWidth; c.height = 150
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, c.width, c.height)
    ctx.strokeStyle = '#0F172A'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  }, [])
  const pos = (e) => { const r = canvasRef.current.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return { x: t.clientX - r.left, y: t.clientY - r.top } }
  const start = (e) => { e.preventDefault(); setDrawing(true); const ctx = canvasRef.current.getContext('2d'); const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y) }
  const draw = (e) => { if (!drawing) return; e.preventDefault(); const ctx = canvasRef.current.getContext('2d'); const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); setHasSig(true) }
  const end = () => { if (!drawing) return; setDrawing(false); if (hasSig) onSave(canvasRef.current.toDataURL('image/png')) }
  const clear = () => { const c = canvasRef.current, ctx = c.getContext('2d'); ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, c.width, c.height); ctx.strokeStyle = '#0F172A'; ctx.lineWidth = 2; setHasSig(false); onClear() }
  return (
    <div>
      <div style={{ border: '2px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', touchAction: 'none', position: 'relative' }}>
        <canvas ref={canvasRef} onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={end}
          style={{ display: 'block', width: '100%', cursor: 'crosshair' }} />
        {!hasSig && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#94A3B8', fontSize: 14, pointerEvents: 'none' }}>Sign here</div>}
      </div>
      {hasSig && <button type="button" onClick={clear} style={{ marginTop: 6, border: 'none', background: 'none', color: '#94A3B8', fontSize: 12, cursor: 'pointer' }}>Clear signature</button>}
    </div>
  )
}

// ── Main ──
export default function AttendPage() {
  const { eventCode } = useParams()

  // Data
  const [event, setEvent] = useState(null)
  const [brand, setBrand] = useState({ name: '', logo: '', banner: '', primary: '#0F766E', secondary: '#F0FDFA', accent: '#F59E0B', pin: '1234', btnStyle: 'rounded' })
  const [participants, setParticipants] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)

  // UI state
  const [screen, setScreen] = useState('search') // search | confirm | success | walkin | admin
  const [searchMode, setSearchMode] = useState('code') // code | name
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [day, setDay] = useState('')
  const [sig, setSig] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitErr, setSubmitErr] = useState('')
  const [lastSub, setLastSub] = useState(null)

  // Walk-in
  const [wiName, setWiName] = useState('')
  const [wiOrg, setWiOrg] = useState('')
  const [wiEmail, setWiEmail] = useState('')
  const [wiPos, setWiPos] = useState('')
  const [wiSex, setWiSex] = useState('')

  // Admin
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})
  const [adminSearch, setAdminSearch] = useState('')

  const [counters, setCounters] = useState({})
  const [walkinCount, setWalkinCount] = useState(0)

  useEffect(() => { load() }, [eventCode])

  async function load() {
    setLoading(true)
    const { data: ev, error: evErr } = await supabase
      .from('events').select('*, organizations(name, logo_url, banner_url, primary_color, secondary_color, accent_color, admin_pin, button_style)')
      .eq('event_code', eventCode).single()
    if (evErr || !ev) { setLoadError('Event not found.'); setLoading(false); return }
    setEvent(ev)
    const o = ev.organizations || {}
    setBrand({
      name: o.name || '', logo: o.logo_url || '', banner: o.banner_url || '',
      primary: o.primary_color || '#0F766E', secondary: o.secondary_color || '#F0FDFA',
      accent: o.accent_color || '#F59E0B', pin: o.admin_pin || '1234',
      btnStyle: o.button_style || 'rounded',
    })
    const [pRes, aRes] = await Promise.all([
      supabase.from('participants').select('*').eq('event_id', ev.id).order('code'),
      supabase.from('attendance').select('*').eq('event_id', ev.id),
    ])
    setParticipants(pRes.data || [])
    setAttendance(aRes.data || [])
    updCount(aRes.data || [], ev.num_days, pRes.data || [])
    setLoading(false)
  }

  function updCount(att, n, parts) {
    const c = {}
    for (let i = 1; i <= n; i++) c[`Day ${i}`] = att.filter(a => a.day === `Day ${i}`).length
    setCounters(c)
    setWalkinCount((parts || participants).filter(p => p.code?.startsWith('W-')).length)
  }

  // ── Search logic ──
  const results = (() => {
    if (searchMode === 'code') return [] // code mode uses Find Me button
    if (query.length < 1) return []
    const q = query.toLowerCase()
    return participants.filter(p =>
      p.name.toLowerCase().includes(q) || (p.organization && p.organization.toLowerCase().includes(q))
    ).slice(0, 10)
  })()

  function findByCode() {
    const q = query.trim().replace(/^0+/, '')
    const match = participants.find(p => {
      const code = (p.code || '').replace(/^0+/, '').replace(/^W-0*/, '')
      return code === q || p.code === q || p.code === q.padStart(3, '0')
    })
    if (match) { pick(match) }
    else { setSubmitErr('No participant found with that code.'); setTimeout(() => setSubmitErr(''), 3000) }
  }

  function pick(p) { setSelected(p); setDay(''); setSig(null); setSubmitErr(''); setScreen('confirm') }
  function signed(pid, d) { return attendance.some(a => a.participant_id === pid && a.day === d) }

  async function uploadSig(participantId) {
    if (!sig) return null
    try {
      const blob = await (await fetch(sig)).blob()
      const path = `${event.id}/${participantId}_${day.replace(' ', '')}_${Date.now()}.png`
      const { error } = await supabase.storage.from('signatures').upload(path, blob, { contentType: 'image/png' })
      if (error) return null
      const { data } = supabase.storage.from('signatures').getPublicUrl(path)
      return data?.publicUrl || null
    } catch { return null }
  }

  async function submit() {
    if (!day || !sig) return
    setSubmitting(true); setSubmitErr('')
    if (signed(selected.id, day)) { setSubmitErr(`Already signed for ${day}.`); setSubmitting(false); return }
    try {
      const sigUrl = await uploadSig(selected.id)
      const { error } = await supabase.from('attendance').insert({
        participant_id: selected.id, event_id: event.id, day,
        signed_at: new Date().toISOString(), signature_url: sigUrl, user_agent: navigator.userAgent,
      })
      if (error) { setSubmitErr(error.message); setSubmitting(false); return }
      const upd = [...attendance, { participant_id: selected.id, day }]
      setAttendance(upd); updCount(upd, event.num_days, participants)
      setLastSub({ name: selected.name, org: selected.organization, day })
      setScreen('success')
    } catch { setSubmitErr('Something went wrong.') }
    setSubmitting(false)
  }

  async function submitWalkin(e) {
    e.preventDefault()
    if (!wiName.trim() || !day || !sig) return
    setSubmitting(true); setSubmitErr('')
    try {
      const wiCode = 'W-' + String(participants.filter(p => p.code?.startsWith('W-')).length + 1).padStart(3, '0')
      const { data: np, error: pe } = await supabase.from('participants').insert({
        event_id: event.id, name: wiName.trim(), organization: wiOrg.trim() || null,
        email: wiEmail.trim() || null, position: wiPos.trim() || null, sex: wiSex || null, code: wiCode,
      }).select().single()
      if (pe) { setSubmitErr(pe.message); setSubmitting(false); return }
      const sigUrl = await uploadSig(np.id)
      await supabase.from('attendance').insert({
        participant_id: np.id, event_id: event.id, day,
        signed_at: new Date().toISOString(), signature_url: sigUrl, user_agent: navigator.userAgent,
      })
      const newParts = [...participants, np]
      setParticipants(newParts)
      const upd = [...attendance, { participant_id: np.id, day }]
      setAttendance(upd); updCount(upd, event.num_days, newParts)
      setLastSub({ name: np.name, org: np.organization, day })
      setScreen('success')
    } catch { setSubmitErr('Something went wrong.') }
    setSubmitting(false)
  }

  // Admin edit
  async function saveEdit() {
    if (!editData.name?.trim()) return
    await supabase.from('participants').update({
      name: editData.name.trim(), organization: editData.organization?.trim() || null,
      email: editData.email?.trim() || null, position: editData.position?.trim() || null,
      sex: editData.sex || null,
    }).eq('id', editId)
    setEditId(null); load()
  }

  function reset() {
    setScreen('search'); setQuery(''); setSelected(null); setDay(''); setSig(null)
    setSubmitErr(''); setWiName(''); setWiOrg(''); setWiEmail(''); setWiPos(''); setWiSex('')
  }

  // ── Styles ──
  const B = brand
  const R = B.btnStyle === 'pill' ? '999px' : B.btnStyle === 'square' ? '4px' : '10px'
  const font = "'Plus Jakarta Sans', -apple-system, sans-serif"
  const shell = { maxWidth: 500, margin: '0 auto', minHeight: '100vh', fontFamily: font, background: '#F1F5F9' }
  const card = { background: '#fff', borderRadius: 14, padding: 18, margin: '12px 14px', boxShadow: '0 2px 10px rgba(0,0,0,.05)' }
  const inp = { width: '100%', padding: '11px 14px', border: '2px solid #E2E8F0', borderRadius: 8, fontSize: 16, outline: 'none', boxSizing: 'border-box', fontFamily: font }
  const btnPrimary = { width: '100%', padding: '13px', borderRadius: R, border: 'none', background: B.primary, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', fontFamily: font }
  const btnAccent = { ...btnPrimary, background: B.accent }
  const btnOutline = { ...btnPrimary, background: '#fff', color: '#64748B', border: '1.5px solid #E2E8F0' }

  if (loading) return <div style={shell}><div style={{ background: B.primary, padding: 20, color: '#fff', textAlign: 'center', fontSize: 16 }}>Loading...</div></div>
  if (loadError) return <div style={shell}><div style={{ background: B.primary, padding: '16px 20px', color: '#fff', fontSize: 20, fontWeight: 700 }}>SignIn</div><div style={card}><p style={{ color: '#DC2626', textAlign: 'center' }}>{loadError}</p></div></div>

  // ── HEADER ──
  const Header = () => {
    if (B.banner) {
      return (
        <div style={{ position: 'relative' }}>
          <img src={B.banner} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px 18px 14px', background: 'linear-gradient(transparent, rgba(0,0,0,.75))', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {B.logo && <img src={B.logo} alt="" style={{ height: 36, borderRadius: 6 }} />}
              <div>
                <div style={{ fontSize: 11, letterSpacing: 1.5, opacity: .8, textTransform: 'uppercase' }}>{B.name}</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 1 }}>{event.name}</div>
                <div style={{ fontSize: 12, opacity: .7 }}>{participants.length} registered{walkinCount > 0 ? ` + ${walkinCount} walk-ins` : ''}</div>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div style={{ background: B.primary, padding: '16px 18px', color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
        {B.logo && <img src={B.logo} alt="" style={{ height: 44, borderRadius: 8, background: 'rgba(255,255,255,.12)', padding: 3 }} />}
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1.5, opacity: .7, textTransform: 'uppercase' }}>{B.name}</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 1 }}>{event.name}</div>
          <div style={{ fontSize: 12, opacity: .6 }}>{participants.length} registered{walkinCount > 0 ? ` + ${walkinCount} walk-ins` : ''}</div>
        </div>
      </div>
    )
  }

  // ── COUNTERS ──
  const Counters = () => (
    <div style={{ display: 'flex', gap: 8, padding: '10px 14px 0' }}>
      {Object.entries(counters).map(([d, c], i) => (
        <div key={d} style={{ flex: 1, background: '#fff', borderRadius: 10, padding: '10px 6px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: B.primary }}>{c}</div>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>{d}</div>
        </div>
      ))}
      {walkinCount > 0 && (
        <div style={{ flex: 1, background: '#fff', borderRadius: 10, padding: '10px 6px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: B.accent }}>{walkinCount}</div>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Walk-ins</div>
        </div>
      )}
    </div>
  )

  // ── DAY PICKER ──
  const DayPicker = ({ disabledCheck }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>Select day</label>
      <div style={{ display: 'flex', gap: 8 }}>
        {Array.from({ length: event.num_days }, (_, i) => {
          const d = `Day ${i + 1}`, dis = disabledCheck ? disabledCheck(d) : false, act = day === d
          return (
            <button key={d} type="button" disabled={dis} onClick={() => setDay(d)} style={{
              flex: 1, padding: '10px 8px', borderRadius: R,
              border: act ? `2px solid ${B.primary}` : '2px solid #E2E8F0',
              background: dis ? '#F1F5F9' : act ? B.secondary : '#fff',
              color: dis ? '#94A3B8' : act ? B.primary : '#0F172A',
              fontWeight: 700, fontSize: 14, cursor: dis ? 'not-allowed' : 'pointer',
              fontFamily: font, opacity: dis ? .5 : 1,
            }}>
              {d}{dis && <div style={{ fontSize: 10, opacity: .7 }}>Signed ✓</div>}
            </button>
          )
        })}
      </div>
    </div>
  )

  // ═══════════════════════════════════════
  // SCREENS
  // ═══════════════════════════════════════

  return (
    <div style={shell}>
      <Header />
      <Counters />

      {/* ── SEARCH SCREEN ── */}
      {screen === 'search' && (
        <div style={card}>
          {/* Code / Name toggle */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderRadius: R, overflow: 'hidden', border: `2px solid ${B.primary}` }}>
            {['code', 'name'].map(m => (
              <button key={m} onClick={() => { setSearchMode(m); setQuery(''); setSubmitErr('') }} style={{
                flex: 1, padding: '9px', border: 'none', fontFamily: font,
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                background: searchMode === m ? B.secondary : '#fff',
                color: searchMode === m ? B.primary : '#94A3B8',
              }}>By {m === 'code' ? 'Code' : 'Name'}</button>
            ))}
          </div>

          {searchMode === 'code' ? (
            <>
              <div style={{ marginBottom: 6, fontSize: 12, color: '#64748B', fontWeight: 600 }}>Participant Code</div>
              <input type="text" placeholder="e.g. 001 or W-001" value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && findByCode()}
                style={{ ...inp, fontSize: 22, textAlign: 'center', letterSpacing: 4, fontWeight: 700, marginBottom: 10 }} autoFocus />
              <button onClick={findByCode} style={btnPrimary}>Find Me</button>
            </>
          ) : (
            <>
              <input type="text" placeholder="Search by name or organization..." value={query} onChange={e => setQuery(e.target.value)}
                style={{ ...inp, marginBottom: 8 }} autoFocus />
              {results.length > 0 && (
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {results.map(p => (
                    <button key={p.id} onClick={() => pick(p)} style={{
                      width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 10px', border: 'none', background: 'none', cursor: 'pointer',
                      borderBottom: '1px solid #F1F5F9', textAlign: 'left', fontFamily: font,
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: '#0F172A' }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: '#64748B' }}>{p.organization || ''}</div>
                      </div>
                      <code style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>{p.code}</code>
                    </button>
                  ))}
                </div>
              )}
              {query.length >= 2 && results.length === 0 && (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#64748B', fontSize: 14 }}>No match found.</div>
              )}
            </>
          )}

          {submitErr && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: 10, borderRadius: 8, fontSize: 13, marginTop: 10 }}>{submitErr}</div>}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={() => { setScreen('walkin'); setDay(''); setSig(null); setSubmitErr('') }} style={{ ...btnAccent, flex: 1 }}>
              Walk-in Registration
            </button>
          </div>

          {/* Admin access */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={() => { setScreen('admin'); setPinInput(''); setPinError(''); setAdminUnlocked(false) }}
              style={{ border: 'none', background: 'none', color: '#94A3B8', fontSize: 12, cursor: 'pointer', fontFamily: font, textDecoration: 'underline' }}>
              Admin
            </button>
          </div>
        </div>
      )}

      {/* ── CONFIRM SCREEN ── */}
      {screen === 'confirm' && selected && (
        <div style={card}>
          <div style={{ marginBottom: 14, padding: '12px 14px', background: B.secondary, borderRadius: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: B.primary }}>{selected.name}</div>
            <div style={{ fontSize: 13, color: '#64748B' }}>{selected.organization || ''}</div>
            {selected.position && <div style={{ fontSize: 12, color: '#94A3B8' }}>{selected.position}</div>}
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Code: {selected.code}</div>
          </div>

          <DayPicker disabledCheck={(d) => signed(selected.id, d)} />

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>Signature</label>
            <SignaturePad onSave={setSig} onClear={() => setSig(null)} primaryColor={B.primary} />
          </div>

          {submitErr && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 10 }}>{submitErr}</div>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={reset} style={{ ...btnOutline, flex: 1 }}>Back</button>
            <button onClick={submit} disabled={!day || !sig || submitting}
              style={{ ...btnPrimary, flex: 2, opacity: (!day || !sig || submitting) ? .4 : 1 }}>
              {submitting ? 'Submitting...' : 'Confirm Attendance'}
            </button>
          </div>
        </div>
      )}

      {/* ── WALK-IN SCREEN ── */}
      {screen === 'walkin' && (
        <div style={card}>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 14, color: B.primary }}>Walk-in Registration</div>
          <form onSubmit={submitWalkin}>
            <div style={{ marginBottom: 8 }}><input placeholder="Full name *" value={wiName} onChange={e => setWiName(e.target.value)} required style={inp} /></div>
            <div style={{ marginBottom: 8 }}><input placeholder="Organization" value={wiOrg} onChange={e => setWiOrg(e.target.value)} style={inp} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <input placeholder="Email" type="email" value={wiEmail} onChange={e => setWiEmail(e.target.value)} style={inp} />
              <input placeholder="Position" value={wiPos} onChange={e => setWiPos(e.target.value)} style={inp} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <select value={wiSex} onChange={e => setWiSex(e.target.value)} style={inp}>
                <option value="">Sex</option><option>Male</option><option>Female</option>
              </select>
            </div>
            <DayPicker />
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>Signature</label>
              <SignaturePad onSave={setSig} onClear={() => setSig(null)} primaryColor={B.primary} />
            </div>
            {submitErr && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 10 }}>{submitErr}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={reset} style={{ ...btnOutline, flex: 1 }}>Back</button>
              <button type="submit" disabled={!wiName.trim() || !day || !sig || submitting}
                style={{ ...btnAccent, flex: 2, opacity: (!wiName.trim() || !day || !sig || submitting) ? .4 : 1 }}>
                {submitting ? 'Submitting...' : 'Register & Sign'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── SUCCESS SCREEN ── */}
      {screen === 'success' && lastSub && (
        <div style={card}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 36, color: '#059669' }}>✓</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{lastSub.name}</div>
            <div style={{ fontSize: 14, color: '#64748B' }}>{lastSub.org || ''}</div>
            <div style={{ display: 'inline-block', padding: '6px 18px', borderRadius: R, fontSize: 14, fontWeight: 700, marginTop: 12, background: B.secondary, color: B.primary }}>{lastSub.day} Signed ✓</div>
          </div>
          <button onClick={reset} style={{ ...btnPrimary, marginTop: 20 }}>Next Participant</button>
        </div>
      )}

      {/* ── ADMIN SCREEN ── */}
      {screen === 'admin' && (
        <div style={card}>
          {!adminUnlocked ? (
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>Admin Access</div>
              <div style={{ marginBottom: 4, fontSize: 12, color: '#64748B', fontWeight: 600 }}>Enter PIN</div>
              <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                onKeyDown={e => { if (e.key === 'Enter') { if (pinInput === B.pin) setAdminUnlocked(true); else setPinError('Wrong PIN.') } }}
                style={{ ...inp, fontSize: 24, textAlign: 'center', letterSpacing: 8, fontWeight: 700, maxWidth: 200, marginBottom: 10 }} autoFocus maxLength={6} />
              {pinError && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 10 }}>{pinError}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={reset} style={{ ...btnOutline, flex: 1 }}>Back</button>
                <button onClick={() => { if (pinInput === B.pin) setAdminUnlocked(true); else setPinError('Wrong PIN.') }}
                  style={{ ...btnPrimary, flex: 1 }}>Unlock</button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>Admin Panel</div>
                <button onClick={reset} style={{ border: 'none', background: 'none', color: '#64748B', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>✕ Close</button>
              </div>

              <input placeholder="Search participants..." value={adminSearch} onChange={e => setAdminSearch(e.target.value)}
                style={{ ...inp, marginBottom: 12, fontSize: 14 }} />

              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {participants
                  .filter(p => !adminSearch || p.name.toLowerCase().includes(adminSearch.toLowerCase()) || (p.organization || '').toLowerCase().includes(adminSearch.toLowerCase()))
                  .map(p => {
                    const pAtt = attendance.filter(a => a.participant_id === p.id)
                    const isEditing = editId === p.id

                    if (isEditing) {
                      return (
                        <div key={p.id} style={{ padding: 12, background: B.secondary, borderRadius: 10, marginBottom: 8 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                            <input value={editData.name || ''} onChange={e => setEditData({ ...editData, name: e.target.value })} placeholder="Name *" style={{ ...inp, fontSize: 13, padding: '7px 10px' }} />
                            <input value={editData.organization || ''} onChange={e => setEditData({ ...editData, organization: e.target.value })} placeholder="Organization" style={{ ...inp, fontSize: 13, padding: '7px 10px' }} />
                            <input value={editData.email || ''} onChange={e => setEditData({ ...editData, email: e.target.value })} placeholder="Email" style={{ ...inp, fontSize: 13, padding: '7px 10px' }} />
                            <input value={editData.position || ''} onChange={e => setEditData({ ...editData, position: e.target.value })} placeholder="Position" style={{ ...inp, fontSize: 13, padding: '7px 10px' }} />
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={saveEdit} style={{ ...btnPrimary, padding: '8px', fontSize: 13, flex: 1 }}>Save</button>
                            <button onClick={() => setEditId(null)} style={{ ...btnOutline, padding: '8px', fontSize: 13, flex: 1 }}>Cancel</button>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: '#64748B' }}>{p.organization || ''} {p.code && <span style={{ color: '#94A3B8' }}>({p.code})</span>}</div>
                          <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                            {Array.from({ length: event.num_days }, (_, i) => {
                              const d = `Day ${i + 1}`, s = pAtt.some(a => a.day === d)
                              return <span key={d} style={{ width: 22, height: 22, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, background: s ? '#ECFDF5' : '#F1F5F9', color: s ? '#059669' : '#94A3B8' }}>{s ? '✓' : i + 1}</span>
                            })}
                          </div>
                        </div>
                        <button onClick={() => { setEditId(p.id); setEditData({ name: p.name, organization: p.organization || '', email: p.email || '', position: p.position || '' }) }}
                          style={{ border: 'none', background: B.secondary, color: B.primary, padding: '6px 12px', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: font }}>
                          Edit
                        </button>
                      </div>
                    )
                  })}
              </div>

              <div style={{ marginTop: 16, padding: '12px 0', borderTop: '1px solid #E2E8F0', fontSize: 12, color: '#64748B' }}>
                {participants.length} participants | {attendance.length} total signatures
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ textAlign: 'center', padding: 14, fontSize: 11, color: '#94A3B8' }}>SignIn v2.1.1</div>
    </div>
  )
}
