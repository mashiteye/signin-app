import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { org, user } = useAuth()
  const fileRef = useRef()

  const [event, setEvent] = useState(null)
  const [participants, setParticipants] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('participants')
  const [showAdd, setShowAdd] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  // Add participant form
  const [addName, setAddName] = useState('')
  const [addOrg, setAddOrg] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addPosition, setAddPosition] = useState('')
  const [addSex, setAddSex] = useState('')
  const [addProgram, setAddProgram] = useState('')
  const [addError, setAddError] = useState('')

  // Edit participant
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({})
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Event settings
  const [evName, setEvName] = useState('')
  const [evDesc, setEvDesc] = useState('')
  const [evDateStart, setEvDateStart] = useState('')
  const [evDateEnd, setEvDateEnd] = useState('')
  const [evDays, setEvDays] = useState(1)
  const [evSaving, setEvSaving] = useState(false)
  const [evError, setEvError] = useState('')
  const [evSuccess, setEvSuccess] = useState('')

  useEffect(() => { loadAll() }, [id])

  async function loadAll() {
    setLoading(true)
    const [evRes, partRes, attRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).single(),
      supabase.from('participants').select('*').eq('event_id', id).order('code'),
      supabase.from('attendance').select('*').eq('event_id', id).order('signed_at', { ascending: false }),
    ])
    if (evRes.data) {
      setEvent(evRes.data)
      setEvName(evRes.data.name)
      setEvDesc(evRes.data.description || '')
      setEvDateStart(evRes.data.date_start || '')
      setEvDateEnd(evRes.data.date_end || '')
      setEvDays(evRes.data.num_days)
    }
    if (partRes.data) setParticipants(partRes.data)
    if (attRes.data) setAttendance(attRes.data)
    setLoading(false)
  }

  const attendLink = event?.event_code ? `${window.location.origin}/attend/${event.event_code}` : ''

  function copyLink() {
    navigator.clipboard.writeText(attendLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  // ── ADD PARTICIPANT ──
  async function handleAddParticipant(e) {
    e.preventDefault()
    setAddError('')
    if (!addName.trim()) { setAddError('Name is required.'); return }
    const nextCode = String(participants.length + 1).padStart(3, '0')
    const { error } = await supabase.from('participants').insert({
      event_id: id, name: addName.trim(), organization: addOrg.trim() || null,
      email: addEmail.trim() || null, position: addPosition.trim() || null,
      sex: addSex || null, program: addProgram.trim() || null, code: nextCode,
    })
    if (error) { setAddError(error.message); return }
    setAddName(''); setAddOrg(''); setAddEmail(''); setAddPosition(''); setAddSex(''); setAddProgram('')
    setShowAdd(false)
    loadAll()
  }

  // ── EDIT PARTICIPANT ──
  function startEdit(p) {
    setEditId(p.id)
    setEditData({ name: p.name, organization: p.organization || '', email: p.email || '', position: p.position || '', sex: p.sex || '', program: p.program || '' })
    setEditError('')
  }

  function cancelEdit() { setEditId(null); setEditData({}); setEditError('') }

  async function saveEdit() {
    if (!editData.name?.trim()) { setEditError('Name is required.'); return }
    setEditSaving(true); setEditError('')
    const { error } = await supabase.from('participants').update({
      name: editData.name.trim(),
      organization: editData.organization.trim() || null,
      email: editData.email.trim() || null,
      position: editData.position.trim() || null,
      sex: editData.sex || null,
      program: editData.program.trim() || null,
    }).eq('id', editId)
    if (error) { setEditError(error.message); setEditSaving(false); return }

    await supabase.from('audit_log').insert({
      org_id: org.id, event_id: id, action: 'participant_edited',
      actor_id: user.id, details: { participant_id: editId, changes: editData },
    })

    setEditSaving(false); cancelEdit(); loadAll()
  }

  // ── CSV UPLOAD ──
  async function handleCSVUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setUploadMsg('')
    try {
      const text = await file.text()
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length < 2) { setUploadMsg('CSV needs a header + data rows.'); setUploading(false); return }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
      const nameIdx = headers.findIndex(h => ['name','full name','fullname'].includes(h))
      const orgIdx = headers.findIndex(h => ['organization','org','organisation'].includes(h))
      const emailIdx = headers.findIndex(h => h === 'email')
      const posIdx = headers.findIndex(h => ['position','title','role'].includes(h))
      const sexIdx = headers.findIndex(h => ['sex','gender'].includes(h))
      const progIdx = headers.findIndex(h => ['program','programme'].includes(h))
      if (nameIdx === -1) { setUploadMsg('CSV must have a "Name" column.'); setUploading(false); return }

      const rows = []; let codeStart = participants.length + 1
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i])
        const name = cols[nameIdx]?.trim()
        if (!name) continue
        rows.push({
          event_id: id, name, organization: cols[orgIdx]?.trim() || null,
          email: cols[emailIdx]?.trim() || null, position: cols[posIdx]?.trim() || null,
          sex: cols[sexIdx]?.trim() || null, program: cols[progIdx]?.trim() || null,
          code: String(codeStart++).padStart(3, '0'),
        })
      }
      if (rows.length === 0) { setUploadMsg('No valid rows.'); setUploading(false); return }
      const { error } = await supabase.from('participants').insert(rows)
      setUploadMsg(error ? `Failed: ${error.message}` : `${rows.length} participants added.`)
      if (!error) loadAll()
    } catch (err) { setUploadMsg(`Error: ${err.message}`) }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function parseCSVLine(line) {
    const result = []; let current = '', inQ = false
    for (const c of line) { if (c === '"') { inQ = !inQ; continue } if (c === ',' && !inQ) { result.push(current); current = ''; continue } current += c }
    result.push(current); return result
  }

  // ── DELETE PARTICIPANT ──
  async function deleteParticipant(pId) {
    if (!confirm('Remove this participant? Their attendance records will also be deleted.')) return
    await supabase.from('attendance').delete().eq('participant_id', pId)
    await supabase.from('participants').delete().eq('id', pId)
    loadAll()
  }

  // ── EXPORT ATTENDANCE ──
  function exportCSV() {
    const headers = ['Code', 'Name', 'Organization', 'Email', 'Position', 'Sex', 'Program']
    for (let i = 1; i <= event.num_days; i++) headers.push(`Day ${i} Signed`, `Day ${i} Time`, `Day ${i} Signature`)
    const rows = participants.map(p => {
      const pAtt = attendance.filter(a => a.participant_id === p.id)
      const row = [p.code, p.name, p.organization || '', p.email || '', p.position || '', p.sex || '', p.program || '']
      for (let i = 1; i <= event.num_days; i++) {
        const a = pAtt.find(a => a.day === `Day ${i}`)
        row.push(a ? 'Yes' : 'No')
        row.push(a ? new Date(a.signed_at).toLocaleString('en-GB') : '')
        row.push(a?.signature_url || '')
      }
      return row
    })

    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event.name.replace(/[^a-zA-Z0-9]/g, '_')}_attendance.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── EVENT SETTINGS ──
  async function saveEventSettings(e) {
    e.preventDefault()
    setEvSaving(true); setEvError(''); setEvSuccess('')
    const { error } = await supabase.from('events').update({
      name: evName.trim(), description: evDesc.trim() || null,
      date_start: evDateStart, date_end: evDateEnd || evDateStart,
      num_days: evDays,
    }).eq('id', id)
    if (error) { setEvError(error.message) } else { setEvSuccess('Saved.'); loadAll(); setTimeout(() => setEvSuccess(''), 2000) }
    setEvSaving(false)
  }

  async function archiveEvent() {
    if (!confirm('Archive this event? It will still be visible but marked as archived.')) return
    await supabase.from('events').update({ status: 'archived' }).eq('id', id)
    await supabase.from('audit_log').insert({
      org_id: org.id, event_id: id, action: 'event_archived', actor_id: user.id, details: {},
    })
    loadAll()
  }

  async function deleteEvent() {
    if (!confirm('Permanently delete this event and all its data? This cannot be undone.')) return
    if (!confirm('Are you sure? All participants, attendance records, and signatures will be lost.')) return
    await supabase.from('attendance').delete().eq('event_id', id)
    await supabase.from('participants').delete().eq('event_id', id)
    await supabase.from('audit_log').delete().eq('event_id', id)
    await supabase.from('events').delete().eq('id', id)
    navigate('/')
  }

  // ── HELPERS ──
  function getAttendanceForDay(day) { return attendance.filter(a => a.day === day) }
  function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' }
  function participantAttendance(pid) { return attendance.filter(a => a.participant_id === pid) }

  if (loading) return <div className="card" style={{ padding: 60, textAlign: 'center' }}><div className="spinner spinner-dark" style={{ width: 28, height: 28, margin: '0 auto' }} /></div>
  if (!event) return <div className="card card-pad text-center"><p>Event not found.</p><button className="btn btn-secondary mt-4" onClick={() => navigate('/')}>Back</button></div>

  return (
    <div>
      <button className="btn btn-secondary btn-sm mb-4" onClick={() => navigate('/')}>← Back</button>

      {/* Event header */}
      <div className="card card-pad mb-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700 }}>{event.name}</h1>
              {event.status === 'archived' && <span className="badge badge-gray">Archived</span>}
            </div>
            {event.description && <p className="text-sm text-muted mt-2">{event.description}</p>}
            <div className="text-sm text-muted mt-2" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>{formatDate(event.date_start)}{event.date_end !== event.date_start ? ` – ${formatDate(event.date_end)}` : ''}</span>
              <span>{event.num_days} day{event.num_days !== 1 ? 's' : ''}</span>
              <span>{participants.length} participants</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={exportCSV}>↓ Export CSV</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowSettings(!showSettings)}>
              {showSettings ? 'Close settings' : '⚙ Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Event settings panel */}
      {showSettings && (
        <div className="card card-pad mb-4" style={{ borderColor: 'var(--accent)', background: 'var(--accent-light)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Event settings</h3>
          {evError && <div className="alert alert-error">{evError}</div>}
          {evSuccess && <div className="alert alert-success">{evSuccess}</div>}
          <form onSubmit={saveEventSettings}>
            <div className="form-group">
              <label className="form-label">Event name</label>
              <input className="form-input" value={evName} onChange={e => setEvName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={2} value={evDesc} onChange={e => setEvDesc(e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Start date</label>
                <input type="date" className="form-input" value={evDateStart} onChange={e => setEvDateStart(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">End date</label>
                <input type="date" className="form-input" value={evDateEnd} onChange={e => setEvDateEnd(e.target.value)} min={evDateStart} />
              </div>
              <div className="form-group">
                <label className="form-label">Days</label>
                <input type="number" className="form-input" min={1} max={30} value={evDays} onChange={e => setEvDays(parseInt(e.target.value) || 1)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={evSaving}>
                {evSaving ? 'Saving...' : 'Save changes'}
              </button>
              {event.status !== 'archived' && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={archiveEvent}>Archive event</button>
              )}
              <button type="button" className="btn btn-sm" onClick={deleteEvent}
                style={{ background: 'none', border: 'none', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                Delete event
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Attendance link */}
      <div className="card card-pad mb-4" style={{ background: 'var(--primary-50)', borderColor: 'var(--primary)' }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: 'var(--primary)' }}>
          Attendance link (share with tablets)
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <code style={{ flex: 1, padding: '8px 12px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', fontSize: 13, border: '1px solid var(--border)', wordBreak: 'break-all' }}>{attendLink}</code>
          <a href={attendLink} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Open</a>
          <button className="btn btn-primary btn-sm" onClick={copyLink}>{linkCopied ? '✓ Copied' : 'Copy'}</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(event.num_days + 1, 5)}, 1fr)`, gap: 12, marginBottom: 20 }}>
        <StatCard label="Total" value={participants.length} />
        {Array.from({ length: event.num_days }, (_, i) => {
          const d = `Day ${i + 1}`
          return <StatCard key={d} label={d} value={getAttendanceForDay(d).length} sub={`of ${participants.length}`} />
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <TabBtn active={tab === 'participants'} onClick={() => setTab('participants')}>Participants ({participants.length})</TabBtn>
        <TabBtn active={tab === 'attendance'} onClick={() => setTab('attendance')}>Attendance log ({attendance.length})</TabBtn>
      </div>

      {/* ── PARTICIPANTS TAB ── */}
      {tab === 'participants' && (
        <div className="card">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}>{showAdd ? 'Cancel' : '+ Add'}</button>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              {uploading ? 'Uploading...' : '↑ Upload CSV'}
              <input ref={fileRef} type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: 'none' }} />
            </label>
            {uploadMsg && <span className="text-sm" style={{ color: uploadMsg.includes('ailed') ? 'var(--danger)' : '#065F46' }}>{uploadMsg}</span>}
          </div>

          {showAdd && (
            <div style={{ padding: 16, borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              {addError && <div className="alert alert-error">{addError}</div>}
              <form onSubmit={handleAddParticipant}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <input className="form-input" placeholder="Full name *" value={addName} onChange={e => setAddName(e.target.value)} required />
                  <input className="form-input" placeholder="Organization" value={addOrg} onChange={e => setAddOrg(e.target.value)} />
                  <input className="form-input" placeholder="Email" type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)} />
                  <input className="form-input" placeholder="Position" value={addPosition} onChange={e => setAddPosition(e.target.value)} />
                  <select className="form-input" value={addSex} onChange={e => setAddSex(e.target.value)}><option value="">Sex</option><option>Male</option><option>Female</option></select>
                  <input className="form-input" placeholder="Program" value={addProgram} onChange={e => setAddProgram(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary btn-sm mt-2">Add participant</button>
              </form>
            </div>
          )}

          {participants.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">👥</div>
              <div className="empty-title">No participants yet</div>
              <p className="text-sm text-muted">Add manually or upload a CSV.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Code</th><th>Name</th><th>Organization</th><th>Attendance</th><th></th></tr>
                </thead>
                <tbody>
                  {participants.map(p => {
                    const pAtt = participantAttendance(p.id)
                    const isEditing = editId === p.id

                    if (isEditing) {
                      return (
                        <tr key={p.id} style={{ background: 'var(--primary-50)' }}>
                          <td><code style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>{p.code}</code></td>
                          <td colSpan={2}>
                            {editError && <div className="alert alert-error" style={{ marginBottom: 8 }}>{editError}</div>}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              <input className="form-input" placeholder="Name *" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} style={{ fontSize: 13, padding: '6px 10px' }} />
                              <input className="form-input" placeholder="Organization" value={editData.organization} onChange={e => setEditData({ ...editData, organization: e.target.value })} style={{ fontSize: 13, padding: '6px 10px' }} />
                              <input className="form-input" placeholder="Email" value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} style={{ fontSize: 13, padding: '6px 10px' }} />
                              <input className="form-input" placeholder="Position" value={editData.position} onChange={e => setEditData({ ...editData, position: e.target.value })} style={{ fontSize: 13, padding: '6px 10px' }} />
                              <select className="form-input" value={editData.sex} onChange={e => setEditData({ ...editData, sex: e.target.value })} style={{ fontSize: 13, padding: '6px 10px' }}>
                                <option value="">Sex</option><option>Male</option><option>Female</option>
                              </select>
                              <input className="form-input" placeholder="Program" value={editData.program} onChange={e => setEditData({ ...editData, program: e.target.value })} style={{ fontSize: 13, padding: '6px 10px' }} />
                            </div>
                          </td>
                          <td></td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={editSaving}>{editSaving ? '...' : 'Save'}</button>
                              <button className="btn btn-secondary btn-sm" onClick={cancelEdit}>Cancel</button>
                            </div>
                          </td>
                        </tr>
                      )
                    }

                    return (
                      <tr key={p.id}>
                        <td><code style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>{p.code}</code></td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{p.name}</div>
                          {p.email && <div className="text-sm text-light">{p.email}</div>}
                        </td>
                        <td className="text-sm">{p.organization || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {Array.from({ length: event.num_days }, (_, i) => {
                              const d = `Day ${i + 1}`
                              const s = pAtt.some(a => a.day === d)
                              return (
                                <span key={d} title={d} style={{
                                  width: 24, height: 24, borderRadius: 4, display: 'inline-flex',
                                  alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600,
                                  background: s ? '#ECFDF5' : '#F1F5F9', color: s ? '#065F46' : '#94A3B8',
                                }}>{s ? '✓' : i + 1}</span>
                              )
                            })}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => startEdit(p)} title="Edit" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: 13, fontWeight: 600 }}>Edit</button>
                            <button onClick={() => deleteParticipant(p.id)} title="Remove" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 14 }}>×</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ATTENDANCE TAB ── */}
      {tab === 'attendance' && (
        <div className="card">
          {attendance.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📝</div>
              <div className="empty-title">No attendance records yet</div>
              <p className="text-sm text-muted">Share the attendance link with your registration tablets.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Participant</th><th>Day</th><th>Signed at</th><th>Signature</th></tr></thead>
                <tbody>
                  {attendance.map(a => {
                    const part = participants.find(p => p.id === a.participant_id)
                    return (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 500 }}>{part?.name || 'Unknown'}</td>
                        <td><span className="badge badge-gray">{a.day}</span></td>
                        <td className="text-sm">{new Date(a.signed_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{a.signature_url ? <a href={a.signature_url} target="_blank" rel="noopener noreferrer" className="text-sm" style={{ fontWeight: 500 }}>View</a> : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div className="card card-pad text-center">
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      {sub && <div className="text-sm text-light">{sub}</div>}
      <div className="text-sm text-muted mt-2">{label}</div>
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}>
      {children}
    </button>
  )
}
