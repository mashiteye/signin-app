import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function SignaturePad({ onSave, onClear }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasSig, setHasSig] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvas.parentElement.offsetWidth
    canvas.height = 150
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fafafa'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#0F172A'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    const t = e.touches ? e.touches[0] : e
    return { x: t.clientX - r.left, y: t.clientY - r.top }
  }
  const start = (e) => { e.preventDefault(); setDrawing(true); const ctx = canvasRef.current.getContext('2d'); const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y) }
  const draw = (e) => { if (!drawing) return; e.preventDefault(); const ctx = canvasRef.current.getContext('2d'); const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); setHasSig(true) }
  const end = () => { if (!drawing) return; setDrawing(false); if (hasSig) onSave(canvasRef.current.toDataURL('image/png')) }
  const clear = () => { const c = canvasRef.current, ctx = c.getContext('2d'); ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, c.width, c.height); ctx.strokeStyle = '#0F172A'; ctx.lineWidth = 2; setHasSig(false); onClear() }

  return (
    <div>
      <div style={{ border: '2px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', touchAction: 'none', position: 'relative' }}>
        <canvas ref={canvasRef}
          onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={end}
          style={{ display: 'block', width: '100%', cursor: 'crosshair' }} />
        {!hasSig && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#94A3B8', fontSize: 14, pointerEvents: 'none' }}>Sign here</div>}
      </div>
      {hasSig && <button type="button" onClick={clear} style={{ marginTop: 6, border: 'none', background: 'none', color: '#94A3B8', fontSize: 12, cursor: 'pointer' }}>Clear signature</button>}
    </div>
  )
}

const DEFAULT_C = {
  primary: '#0F766E', primaryLight: '#F0FDFA',
  bg: '#F1F5F9', surface: '#FFFFFF',
  text: '#0F172A', muted: '#64748B', light: '#94A3B8',
  border: '#E2E8F0', green: '#059669', red: '#DC2626',
}

const inp = { width: '100%', padding: '10px 14px', border: '2px solid #E2E8F0', borderRadius: 8, fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: "'Plus Jakarta Sans', sans-serif" }

export default function AttendPage() {
  const { eventCode } = useParams()
  const [event, setEvent] = useState(null)
  const [orgName, setOrgName] = useState('')
  const [orgLogo, setOrgLogo] = useState('')
  const [C, setC] = useState(DEFAULT_C)
  const [participants, setParticipants] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)

  const [screen, setScreen] = useState('search')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [day, setDay] = useState('')
  const [sig, setSig] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitErr, setSubmitErr] = useState('')
  const [lastSub, setLastSub] = useState(null)

  const [wiName, setWiName] = useState('')
  const [wiOrg, setWiOrg] = useState('')
  const [wiEmail, setWiEmail] = useState('')
  const [wiPos, setWiPos] = useState('')
  const [wiSex, setWiSex] = useState('')

  const [counters, setCounters] = useState({})

  useEffect(() => { load() }, [eventCode])

  async function load() {
    setLoading(true)
    const { data: ev, error: evErr } = await supabase
      .from('events').select('*, organizations(name, logo_url, primary_color, secondary_color)').eq('event_code', eventCode).single()
    if (evErr || !ev) { setLoadError('Event not found.'); setLoading(false); return }
    setEvent(ev)
    const o = ev.organizations
    setOrgName(o?.name || '')
    setOrgLogo(o?.logo_url || '')
    if (o?.primary_color) {
      setC({ ...DEFAULT_C, primary: o.primary_color, primaryLight: o.secondary_color || DEFAULT_C.primaryLight })
    }
    const [pRes, aRes] = await Promise.all([
      supabase.from('participants').select('*').eq('event_id', ev.id).order('code'),
      supabase.from('attendance').select('*').eq('event_id', ev.id),
    ])
    setParticipants(pRes.data || [])
    setAttendance(aRes.data || [])
    updCount(aRes.data || [], ev.num_days)
    setLoading(false)
  }

  function updCount(att, n) {
    const c = {}
    for (let i = 1; i <= n; i++) c[`Day ${i}`] = att.filter(a => a.day === `Day ${i}`).length
    setCounters(c)
  }

  const results = query.length >= 1
    ? participants.filter(p => {
        const q = query.toLowerCase()
        return p.name.toLowerCase().includes(q) || (p.code && p.code.includes(q)) || (p.organization && p.organization.toLowerCase().includes(q))
      }).slice(0, 10)
    : []

  function pick(p) { setSelected(p); setDay(''); setSig(null); setSubmitErr(''); setScreen('confirm') }
  function signed(pid, d) { return attendance.some(a => a.participant_id === pid && a.day === d) }

  async function uploadSig(participantId) {
    if (!sig) return null
    const blob = await (await fetch(sig)).blob()
    const path = `${event.id}/${participantId}_${day.replace(' ', '')}_${Date.now()}.png`
    const { error } = await supabase.storage.from('signatures').upload(path, blob, { contentType: 'image/png' })
    if (error) return null
    const { data } = supabase.storage.from('signatures').getPublicUrl(path)
    return data?.publicUrl || null
  }

  async function submit() {
    if (!day || !sig) return
    setSubmitting(true); setSubmitErr('')
    if (signed(selected.id, day)) { setSubmitErr(`${selected.name} already signed for ${day}.`); setSubmitting(false); return }
    try {
      const sigUrl = await uploadSig(selected.id)
      const { error } = await supabase.from('attendance').insert({
        participant_id: selected.id, event_id: event.id, day,
        signed_at: new Date().toISOString(), signature_url: sigUrl,
        user_agent: navigator.userAgent,
      })
      if (error) { setSubmitErr(error.message); setSubmitting(false); return }
      const upd = [...attendance, { participant_id: selected.id, day }]
      setAttendance(upd); updCount(upd, event.num_days)
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
        email: wiEmail.trim() || null, position: wiPos.trim() || null,
        sex: wiSex || null, code: wiCode,
      }).select().single()
      if (pe) { setSubmitErr(pe.message); setSubmitting(false); return }
      const sigUrl = await uploadSig(np.id)
      await supabase.from('attendance').insert({
        participant_id: np.id, event_id: event.id, day,
        signed_at: new Date().toISOString(), signature_url: sigUrl,
        user_agent: navigator.userAgent,
      })
      setParticipants(prev => [...prev, np])
      const upd = [...attendance, { participant_id: np.id, day }]
      setAttendance(upd); updCount(upd, event.num_days)
      setLastSub({ name: np.name, org: np.organization, day })
      setScreen('success')
    } catch { setSubmitErr('Something went wrong.') }
    setSubmitting(false)
  }

  function reset() {
    setScreen('search'); setQuery(''); setSelected(null); setDay(''); setSig(null)
    setSubmitErr(''); setWiName(''); setWiOrg(''); setWiEmail(''); setWiPos(''); setWiSex('')
  }

  const cardStyle = { background: C.surface, borderRadius: 14, padding: 20, margin: '14px', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }

  if (loading) return <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: C.bg }}><div style={{ background: C.primary, padding: '20px', color: '#fff', textAlign: 'center' }}>Loading...</div></div>
  if (loadError) return <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: C.bg }}><div style={{ background: C.primary, padding: '16px 20px', color: '#fff', fontSize: 20, fontWeight: 700 }}>SignIn</div><div style={cardStyle}><p style={{ color: C.red, textAlign: 'center' }}>{loadError}</p></div></div>

  const DayPicker = ({ disabledCheck }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>Select day</label>
      <div style={{ display: 'flex', gap: 8 }}>
        {Array.from({ length: event.num_days }, (_, i) => {
          const d = `Day ${i + 1}`
          const dis = disabledCheck ? disabledCheck(d) : false
          const act = day === d
          return (
            <button key={d} type="button" disabled={dis} onClick={() => setDay(d)} style={{
              flex: 1, padding: '10px 8px', borderRadius: 8,
              border: act ? `2px solid ${C.primary}` : `2px solid ${C.border}`,
              background: dis ? '#F1F5F9' : act ? C.primaryLight : '#fff',
              color: dis ? C.light : act ? C.primary : C.text,
              fontWeight: 600, fontSize: 14, cursor: dis ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: dis ? .5 : 1,
            }}>
              {d}{dis && <div style={{ fontSize: 10, opacity: .7 }}>Signed ✓</div>}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif", background: C.bg }}>
      <div style={{ background: C.primary, padding: '16px 20px', color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
        {orgLogo && (
          <img src={orgLogo} alt="" style={{ height: 40, borderRadius: 6, background: 'rgba(255,255,255,.15)', padding: 3 }} />
        )}
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1.5, opacity: .7, textTransform: 'uppercase' }}>{orgName}</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{event.name}</div>
          <div style={{ fontSize: 12, opacity: .7, marginTop: 2 }}>{participants.length} participants</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '12px 14px 0' }}>
        {Object.entries(counters).map(([d, c]) => (
          <div key={d} style={{ flex: 1, background: C.surface, borderRadius: 10, padding: '10px 8px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{c}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{d}</div>
          </div>
        ))}
      </div>

      {screen === 'search' && (
        <div style={cardStyle}>
          <input type="text" placeholder="Search name, code, or organization..." value={query} onChange={e => setQuery(e.target.value)} autoFocus style={{ ...inp, fontSize: 16 }} />
          {results.length > 0 && <div style={{ marginTop: 10 }}>
            {results.map(p => (
              <button key={p.id} onClick={() => pick(p)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: `1px solid ${C.border}`, textAlign: 'left', fontFamily: 'inherit' }}>
                <div><div style={{ fontWeight: 600, fontSize: 15, color: C.text }}>{p.name}</div><div style={{ fontSize: 12, color: C.muted }}>{p.organization || ''}</div></div>
                <code style={{ fontSize: 12, color: C.light, fontWeight: 600 }}>{p.code}</code>
              </button>
            ))}
          </div>}
          {query.length >= 2 && results.length === 0 && <div style={{ textAlign: 'center', padding: '20px 0', color: C.muted, fontSize: 14 }}>No match found.</div>}
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button onClick={() => { setScreen('walkin'); setDay(''); setSig(null); setSubmitErr('') }}
              style={{ border: `1.5px solid ${C.border}`, background: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: C.muted, fontFamily: 'inherit' }}>
              Walk-in registration
            </button>
          </div>
        </div>
      )}

      {screen === 'confirm' && selected && (
        <div style={cardStyle}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{selected.name}</div>
            <div style={{ fontSize: 13, color: C.muted }}>{selected.organization || ''}</div>
          </div>
          <DayPicker disabledCheck={(d) => signed(selected.id, d)} />
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>Signature</label>
            <SignaturePad onSave={setSig} onClear={() => setSig(null)} />
          </div>
          {submitErr && <div style={{ background: '#FEF2F2', color: C.red, padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{submitErr}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={reset} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1.5px solid ${C.border}`, background: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
            <button onClick={submit} disabled={!day || !sig || submitting} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: C.primary, color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', opacity: (!day || !sig || submitting) ? .4 : 1 }}>
              {submitting ? 'Submitting...' : 'Confirm attendance'}
            </button>
          </div>
        </div>
      )}

      {screen === 'walkin' && (
        <div style={cardStyle}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Walk-in registration</div>
          <form onSubmit={submitWalkin}>
            <div style={{ marginBottom: 10 }}><input placeholder="Full name *" value={wiName} onChange={e => setWiName(e.target.value)} required style={inp} /></div>
            <div style={{ marginBottom: 10 }}><input placeholder="Organization" value={wiOrg} onChange={e => setWiOrg(e.target.value)} style={inp} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <input placeholder="Email" type="email" value={wiEmail} onChange={e => setWiEmail(e.target.value)} style={inp} />
              <input placeholder="Position" value={wiPos} onChange={e => setWiPos(e.target.value)} style={inp} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <select value={wiSex} onChange={e => setWiSex(e.target.value)} style={inp}><option value="">Sex</option><option>Male</option><option>Female</option></select>
            </div>
            <DayPicker />
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>Signature</label>
              <SignaturePad onSave={setSig} onClear={() => setSig(null)} />
            </div>
            {submitErr && <div style={{ background: '#FEF2F2', color: C.red, padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{submitErr}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={reset} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1.5px solid ${C.border}`, background: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
              <button type="submit" disabled={!wiName.trim() || !day || !sig || submitting} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: C.primary, color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', opacity: (!wiName.trim() || !day || !sig || submitting) ? .4 : 1 }}>
                {submitting ? 'Submitting...' : 'Register & sign'}
              </button>
            </div>
          </form>
        </div>
      )}

      {screen === 'success' && lastSub && (
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 32, color: C.green }}>✓</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{lastSub.name}</div>
            <div style={{ fontSize: 13, color: C.muted }}>{lastSub.org || ''}</div>
            <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 16, fontSize: 13, fontWeight: 600, marginTop: 10, background: C.primaryLight, color: C.primary }}>{lastSub.day} Signed ✓</div>
          </div>
          <button onClick={reset} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: C.primary, color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', marginTop: 20 }}>Next participant</button>
        </div>
      )}

      <div style={{ textAlign: 'center', padding: 16, fontSize: 11, color: C.light }}>SignIn v2.0.0</div>
    </div>
  )
}
