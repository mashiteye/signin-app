import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function Dashboard() {
  const { org } = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!org) return
    loadEvents()
  }, [org])

  async function loadEvents() {
    setLoading(true)
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        participants(count),
        attendance(count)
      `)
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })

    if (!error) setEvents(data || [])
    setLoading(false)
  }

  function statusBadge(event) {
    const now = new Date()
    const start = new Date(event.date_start)
    const end = new Date(event.date_end)

    if (event.status === 'archived') return <span className="badge badge-gray">Archived</span>
    if (now < start) return <span className="badge badge-amber">Upcoming</span>
    if (now >= start && now <= end) return <span className="badge badge-green">Live</span>
    return <span className="badge badge-gray">Completed</span>
  }

  function formatDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Events</h1>
          <p className="text-sm text-muted mt-2">
            {org ? `${org.name}` : 'Loading...'}
            {events.length > 0 && ` · ${events.length} event${events.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/events/new')}>
          + New event
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div className="spinner spinner-dark" style={{ width: 28, height: 28, margin: '0 auto' }} />
        </div>
      ) : events.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No events yet</div>
            <p className="text-sm text-muted">Create your first event to start collecting attendance.</p>
            <button className="btn btn-primary mt-4" onClick={() => navigate('/events/new')}>
              Create event
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Days</th>
                  <th>Participants</th>
                  <th>Signed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/events/${ev.id}`)}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{ev.name}</div>
                      {ev.description && (
                        <div className="text-sm text-muted" style={{
                          maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{ev.description}</div>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(ev.date_start)}</td>
                    <td>{ev.num_days}</td>
                    <td>{ev.participants?.[0]?.count ?? 0}</td>
                    <td>{ev.attendance?.[0]?.count ?? 0}</td>
                    <td>{statusBadge(ev)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
