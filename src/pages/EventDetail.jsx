import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { VERSION } from '../lib/version'

const font = "'Plus Jakarta Sans', sans-serif"

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
  const [copied, setCopied] = useState(false)

  // Add participant form
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addOrg, setAddOrg] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addPosition, setAddPosition] = useState('')
  const [addSex, setAddSex] = useState('')
  const [addProgram, setAddProgram] = useState('')

  // Edit participant
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editOrg, setEditOrg] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPosition, setEditPosition] = useState('')
  const [editSex, setEditSex] = useState('')
  const [editProgram, setEditProgram] = useState('')

  const [msg, setMsg] = useState('')

  const primary = org?.primary_color || '#0F766E'
  const attendUrl = event ? `${window.location.origin}/attend/${event.event_code}` : ''

  useEffect(() => { loadAll() }, [id])

  async function loadAll() {
    setLoading(true)
    const [evRes, pRes, aRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).single(),
      supabase.from('participants').select('*').eq('event_id', id).order('code'),
      supabase.from('attendance').select('*').eq('event_id', id),
    ])
    setEvent(evRes.data)
    setParticipants(pRes.data || [])
    setAttendance(aRes.data || [])
    setLoading(false)
  }

  // Generate next participant code
  function nextCode() {
    const existing = participants.map(p => parseInt(p.code?.replace(/\D/g, '') || '0'))
    const max = existing.length > 0 ? Math.max(...existing) : 0
    return String(max + 1).padStart(3, '0')
  }

  // Add participant
  async function handleAdd(e) {
    e.preventDefault()
    const { error } = await supabase.from('participants').insert({
      event_id: id, code: nextCode(), name: addName, organization: addOrg,
      email: addEmail, position: addPosition, sex: addSex, program: addProgram,
    })
    if (error) { setMsg(`Error: ${error.message}`); return }
    setAddName(''); setAddOrg(''); setAddEmail(''); setAddPosition(''); setAddSex(''); setAddProgram('')
    setShowAdd(false)
    setMsg('Participant added')
    loadAll()
  }

  // CSV upload
  async function handleCSV(e) {
    const file = e.target.files[0]
    if (!file) return
    const text = await file.text()
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) { setMsg('CSV needs a header row + at least 1 data row'); return }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const nameIdx = headers.findIndex(h => h === 'name')
    if (nameIdx < 0) { setMsg('CSV must have a "Name" column'); return }

    const orgIdx = headers.findIndex(h => h === 'organization' || h === 'org')
    const emailIdx = headers.findIndex(h => h === 'email')
    const posIdx = headers.findIndex(h => h === 'position' || h === 'title')
    const sexIdx = headers.findIndex(h => h === 'sex' || h === 'gender')
    const progIdx = headers.findIndex(h => h === 'program')

    let codeNum = participants.length
    const rows = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim())
      const name = cols[nameIdx]
      if (!name) continue
      codeNum++
      rows.push({
        event_id: id, code: String(codeNum).padStart(3, '0'), name,
        organization: orgIdx >= 0 ? cols[orgIdx] || '' : '',
        email: emailIdx >= 0 ? cols[emailIdx] || '' : '',
        position: posIdx >= 0 ? cols[posIdx] || '' : '',
        sex: sexIdx >= 0 ? cols[sexIdx] || '' : '',
        program: progIdx >= 0 ? cols[progIdx] || '' : '',
      })
    }

    if (rows.length === 0) { setMsg('No valid rows found in CSV'); return }
    const { error } = await supabase.from('participants').insert(rows)
    if (error) { setMsg(`CSV error: ${error.message}`); return }
    setMsg(`${rows.length} participants imported`)
    fileRef.current.value = ''
    loadAll()
  }

  // Edit participant
  function startEdit(p) {
    setEditId(p.id); setEditName(p.name); setEditOrg(p.organization || '')
    setEditEmail(p.email || ''); setEditPosition(p.position || '')
    setEditSex(p.sex || ''); setEditProgram(p.program || '')
  }

  async function saveEdit() {
    await supabase.from('participants').update({
      name: editName, organization: editOrg, email: editEmail,
      position: editPosition, sex: editSex, program: editProgram,
    }).eq('id', editId)
    setEditId(null)
    setMsg('Participant updated')
    loadAll()
  }

  // Delete participant
  async function deletePart(pid) {
    if (!confirm('Delete this participant and their attendance records?')) return
    await supabase.from('attendance').delete().eq('participant_id', pid)
    await supabase.from('participants').delete().eq('id', pid)
    setMsg('Participant deleted')
    loadAll()
  }

  // Delete event
  async function deleteEvent() {
    if (!confirm('Delete this event and all its data? This cannot be undone.')) return
    await supabase.from('attendance').delete().eq('event_id', id)
    await supabase.from('participants').delete().eq('event_id', id)
    await supabase.from('events').delete().eq('id', id)
    navigate('/')
  }

  // Export attendance CSV
  function exportCSV() {
    const header = ['Code', 'Name', 'Organization', 'Email', 'Position', 'Sex', 'Program',
      ...Array.from({ length: event.num_days }, (_, i) => `Day ${i + 1}`)]
    const rows = participants.map(p => {
      const dayChecks = Array.from({ length: event.num_days }, (_, i) => {
        const dayLabel = `Day ${i + 1}`
        return attendance.some(a => a.participant_id === p.id && a.day_label === dayLabel) ? 'Present' : ''
      })
      return [p.code, p.name, p.organization || '', p.email || '', p.position || '', p.sex || '', p.program || '', ...dayChecks]
    })
    const csv = [header, ...rows].map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${event.name.replace(/[^a-zA-Z0-9]/g, '_')}_attendance.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  // Copy attendance link
  function copyLink() {
    navigator.clipboard.writeText(attendUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inputStyle = {
    width: '100%', padding: '8px 10px', border: '2px solid #E2E8F0', borderRadius: 8,
    fontSize: 13, fontFamily: font, outline: 'none', boxSizing: 'border-box',
  }

  const btnStyle = (active) => ({
    border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
    background: active ? primary : 'transparent', color: active ? '#fff' : '#64748B',
    fontWeight: 600, fontSize: 13, fontFamily: font,
  })

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Loading...</div>
  if (!event) return <div style={{ textAlign: 'center', padding: 40, color: '#DC2626' }}>Event not found</div>

  return (
    <div>
      <button onClick={() => navigate('/')} style={{ border: 'none', background: 'none', color: '#64748B', cursor: 'pointer', fontSize: 13, fontFamily: font, marginBottom: 16, padding: 0 }}>← Back to events</button>

      {/* Event header */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 16, border: '1px solid #E2E8F0' }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0F172A' }}>{event.name}</h1>
        <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
          {event.start_date}{event.end_date && event.end_date !== event.start_date ? ` – ${event.end_date}` : ''} • {event.num_days} day{event.num_days !== 1 ? 's' : ''}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, marginTop: 16 }}>
          <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#0F172A' }}>{participants.length}</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>Participants</div>
          </div>
          {Array.from({ length: event.num_days }, (_, i) => {
            const dayLabel = `Day ${i + 1}`
            const count = attendance.filter(a => a.day_label === dayLabel).length
            return (
              <div key={i} style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#0F172A' }}>{count}</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>{dayLabel}</div>
              </div>
            )
          })}
        </div>

        {/* Attendance link */}
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginBottom: 6 }}>Attendance link (share with tablets)</div>
          <div style={{ fontSize: 13, color: '#15803D', wordBreak: 'break-all', marginBottom: 8 }}>{attendUrl}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={copyLink} style={{
              border: '1px solid #86EFAC', background: '#fff', padding: '6px 14px', borderRadius: 6,
              fontSize: 12, fontWeight: 600, color: '#166534', cursor: 'pointer', fontFamily: font,
            }}>{copied ? '✓ Copied!' : '📋 Copy'}</button>
            <a href={attendUrl} target="_blank" rel="noopener noreferrer" style={{
              border: '1px solid #86EFAC', background: '#fff', padding: '6px 14px', borderRadius: 6,
              fontSize: 12, fontWeight: 600, color: '#166534', cursor: 'pointer', fontFamily: font,
              textDecoration: 'none', display: 'inline-block',
            }}>🔗 Open</a>
          </div>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div style={{ background: msg.startsWith('Error') ? '#FEF2F2' : '#F0FDF4', color: msg.startsWith('Error') ? '#DC2626' : '#166534', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
          {msg}
          <button onClick={() => setMsg('')} style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700 }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <button onClick={() => setTab('participants')} style={btnStyle(tab === 'participants')}>Participants</button>
        <button onClick={() => setTab('attendance')} style={btnStyle(tab === 'attendance')}>Attendance</button>
      </div>

      {tab === 'participants' && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #E2E8F0' }}>
          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <button onClick={() => setShowAdd(!showAdd)} style={{
              border: `1.5px solid ${primary}`, background: showAdd ? primary : '#fff', color: showAdd ? '#fff' : primary,
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font,
            }}>+ Add participant</button>
            <label style={{
              border: '1.5px solid #E2E8F0', background: '#fff', color: '#64748B',
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font,
            }}>
              📁 Upload CSV
              <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} style={{ display: 'none' }} />
            </label>
            {participants.length > 0 && (
              <button onClick={exportCSV} style={{
                border: '1.5px solid #E2E8F0', background: '#fff', color: '#64748B',
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font,
              }}>📥 Export CSV</button>
            )}
          </div>

          {/* Add form */}
          {showAdd && (
            <form onSubmit={handleAdd} style={{ background: '#F8FAFC', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <input value={addName} onChange={e => setAddName(e.target.value)} required placeholder="Name *" style={inputStyle} />
                <input value={addOrg} onChange={e => setAddOrg(e.target.value)} placeholder="Organization" style={inputStyle} />
                <input value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="Email" style={inputStyle} />
                <input value={addPosition} onChange={e => setAddPosition(e.target.value)} placeholder="Position" style={inputStyle} />
                <select value={addSex} onChange={e => setAddSex(e.target.value)} style={inputStyle}>
                  <option value="">Sex</option><option>Male</option><option>Female</option>
                </select>
                <input value={addProgram} onChange={e => setAddProgram(e.target.value)} placeholder="Program" style={inputStyle} />
              </div>
              <button type="submit" style={{ border: 'none', background: primary, color: '#fff', padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>Add</button>
            </form>
          )}

          {/* Participant table */}
          {participants.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94A3B8', padding: 20 }}>No participants yet. Add manually or upload a CSV.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                    <th style={{ textAlign: 'left', padding: '8px 6px', color: '#64748B', fontWeight: 600 }}>Code</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', color: '#64748B', fontWeight: 600 }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', color: '#64748B', fontWeight: 600 }}>Organization</th>
                    {Array.from({ length: event.num_days }, (_, i) => (
                      <th key={i} style={{ textAlign: 'center', padding: '8px 6px', color: '#64748B', fontWeight: 600 }}>D{i + 1}</th>
                    ))}
                    <th style={{ textAlign: 'center', padding: '8px 6px', color: '#64748B', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      {editId === p.id ? (
                        <>
                          <td style={{ padding: '6px' }}>{p.code}</td>
                          <td style={{ padding: '6px' }}><input value={editName} onChange={e => setEditName(e.target.value)} style={{ ...inputStyle, padding: '4px 6px' }} /></td>
                          <td style={{ padding: '6px' }}><input value={editOrg} onChange={e => setEditOrg(e.target.value)} style={{ ...inputStyle, padding: '4px 6px' }} /></td>
                          {Array.from({ length: event.num_days }, (_, i) => <td key={i} />)}
                          <td style={{ padding: '6px', textAlign: 'center' }}>
                            <button onClick={saveEdit} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 13 }}>💾</button>
                            <button onClick={() => setEditId(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 13 }}>✕</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '8px 6px', color: '#94A3B8', fontWeight: 500 }}>{p.code}</td>
                          <td style={{ padding: '8px 6px', fontWeight: 500, color: '#0F172A' }}>{p.name}</td>
                          <td style={{ padding: '8px 6px', color: '#64748B' }}>{p.organization || '–'}</td>
                          {Array.from({ length: event.num_days }, (_, i) => {
                            const dayLabel = `Day ${i + 1}`
                            const present = attendance.some(a => a.participant_id === p.id && a.day_label === dayLabel)
                            return (
                              <td key={i} style={{ textAlign: 'center', padding: '8px 6px' }}>
                                {present ? <span style={{ color: '#059669', fontWeight: 700 }}>✓</span> : <span style={{ color: '#E2E8F0' }}>–</span>}
                              </td>
                            )
                          })}
                          <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                            <button onClick={() => startEdit(p)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: '#64748B' }}>✏️</button>
                            <button onClick={() => deletePart(p.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: '#EF4444' }}>🗑</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'attendance' && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: '#0F172A' }}>Attendance records</h3>
          {attendance.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94A3B8' }}>No attendance records yet. Share the attendance link to start collecting.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                    <th style={{ textAlign: 'left', padding: '8px 6px', color: '#64748B' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', color: '#64748B' }}>Day</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px', color: '#64748B' }}>Time</th>
                    <th style={{ textAlign: 'center', padding: '8px 6px', color: '#64748B' }}>Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.sort((a, b) => new Date(b.signed_at || b.created_at) - new Date(a.signed_at || a.created_at)).map(a => {
                    const p = participants.find(pp => pp.id === a.participant_id)
                    return (
                      <tr key={a.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '8px 6px' }}>{p?.name || 'Unknown'}</td>
                        <td style={{ padding: '8px 6px', color: '#64748B' }}>{a.day_label}</td>
                        <td style={{ padding: '8px 6px', color: '#94A3B8', fontSize: 12 }}>{new Date(a.signed_at || a.created_at).toLocaleString()}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                          {a.signature_url ? <a href={a.signature_url} target="_blank" rel="noopener" style={{ color: primary, fontSize: 12 }}>View</a> : '–'}
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

      {/* Danger zone */}
      <div style={{ marginTop: 32, padding: 20, borderRadius: 12, border: '1px solid #FECACA', background: '#FEF2F2' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', marginBottom: 8 }}>Danger zone</div>
        <button onClick={deleteEvent} style={{
          border: '1px solid #EF4444', background: '#fff', color: '#EF4444', padding: '8px 16px',
          borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font,
        }}>Delete this event</button>
      </div>

      <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: '#CBD5E1' }}>SignIn v{VERSION}</div>
    </div>
  )
}
