import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function CreateEvent() {
  const { org, user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [numDays, setNumDays] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-calculate days when dates change
  function handleDateChange(start, end) {
    if (start && end) {
      const d1 = new Date(start)
      const d2 = new Date(end)
      const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) + 1
      if (diff > 0) setNumDays(diff)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError('Event name is required.'); return }
    if (!dateStart) { setError('Start date is required.'); return }

    setLoading(true)

    // Generate a unique event code for the public attendance link
    const code = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 30)
      + '-' + Math.random().toString(36).slice(2, 7)

    const { data, error: insertError } = await supabase
      .from('events')
      .insert({
        org_id: org.id,
        name: name.trim(),
        description: description.trim() || null,
        date_start: dateStart,
        date_end: dateEnd || dateStart,
        num_days: numDays,
        status: 'active',
        event_code: code,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    // Log the action
    await supabase.from('audit_log').insert({
      org_id: org.id,
      event_id: data.id,
      action: 'event_created',
      actor_id: user.id,
      details: { name: data.name },
    })

    navigate(`/events/${data.id}`)
  }

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }}>
      <button className="btn btn-secondary btn-sm mb-4" onClick={() => navigate('/')}>
        ← Back
      </button>

      <div className="card card-pad">
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Create event</h1>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Event name</label>
            <input type="text" className="form-input" placeholder="e.g. MEL CoP Convening 2026"
              value={name} onChange={e => setName(e.target.value)} required autoFocus />
          </div>

          <div className="form-group">
            <label className="form-label">Description <span className="text-light">(optional)</span></label>
            <textarea className="form-input" rows={3} placeholder="Brief description for your records"
              value={description} onChange={e => setDescription(e.target.value)}
              style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Start date</label>
              <input type="date" className="form-input" value={dateStart}
                onChange={e => { setDateStart(e.target.value); handleDateChange(e.target.value, dateEnd) }}
                required />
            </div>
            <div className="form-group">
              <label className="form-label">End date</label>
              <input type="date" className="form-input" value={dateEnd}
                onChange={e => { setDateEnd(e.target.value); handleDateChange(dateStart, e.target.value) }}
                min={dateStart} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Number of days</label>
            <input type="number" className="form-input" min={1} max={30}
              value={numDays} onChange={e => setNumDays(parseInt(e.target.value) || 1)}
              style={{ maxWidth: 100 }} />
            <p className="text-sm text-light mt-2">Auto-calculated from dates, but you can override.</p>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg mt-4" disabled={loading}>
            {loading ? <div className="spinner" /> : 'Create event'}
          </button>
        </form>
      </div>
    </div>
  )
}
