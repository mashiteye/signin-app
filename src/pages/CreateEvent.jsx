import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

const font = "'Plus Jakarta Sans', sans-serif"

function generateCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export default function CreateEvent() {
  const { org, user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [numDays, setNumDays] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Auto-calculate days from date range
  function handleEndDate(val) {
    setEndDate(val)
    if (startDate && val) {
      const diff = Math.ceil((new Date(val) - new Date(startDate)) / 86400000) + 1
      if (diff > 0) setNumDays(diff)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const eventCode = `${name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)}-${generateCode()}`

    const { data, error: err } = await supabase.from('events').insert({
      org_id: org.id,
      name,
      start_date: startDate,
      end_date: endDate || startDate,
      num_days: numDays,
      event_code: eventCode,
      created_by: user.id,
    }).select().single()

    if (err) { setError(err.message); setLoading(false); return }

    await supabase.from('audit_log').insert({
      org_id: org.id, user_id: user.id, action: 'event_created',
      detail: { event_id: data.id, event_name: name }
    })

    navigate(`/events/${data.id}`)
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px', border: '2px solid #E2E8F0', borderRadius: 10,
    fontSize: 15, fontFamily: font, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: 500 }}>
      <button onClick={() => navigate('/')} style={{ border: 'none', background: 'none', color: '#64748B', cursor: 'pointer', fontSize: 13, fontFamily: font, marginBottom: 16, padding: 0 }}>← Back to events</button>
      <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700, color: '#0F172A' }}>Create event</h1>

      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 1px 3px rgba(15,23,42,.06)' }}>
        {error && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Event name</label>
          <input value={name} onChange={e => setName(e.target.value)} required style={inputStyle} placeholder="MEL Community of Practice Convening" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Start date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>End date</label>
            <input type="date" value={endDate} onChange={e => handleEndDate(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Number of days</label>
          <input type="number" min={1} max={30} value={numDays} onChange={e => setNumDays(parseInt(e.target.value) || 1)} required style={{ ...inputStyle, width: 100 }} />
        </div>

        <button type="submit" disabled={loading} style={{
          width: '100%', padding: '12px', border: 'none', borderRadius: 10,
          background: org?.primary_color || '#0F766E', color: '#fff', fontSize: 15,
          fontWeight: 600, cursor: loading ? 'wait' : 'pointer', fontFamily: font,
        }}>{loading ? 'Creating...' : 'Create event'}</button>
      </form>
    </div>
  )
}
