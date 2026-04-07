import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

const font = "'Plus Jakarta Sans', sans-serif"

export default function Dashboard() {
  const { org } = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (org) loadEvents()
  }, [org])

  async function loadEvents() {
    const { data } = await supabase
      .from('events')
      .select('*, participants(count), attendance(count)')
      .eq('org_id', org.id)
      .order('start_date', { ascending: false })
    setEvents(data || [])
    setLoading(false)
  }

  function getStatus(ev) {
    const now = new Date().toISOString().split('T')[0]
    if (ev.end_date && now > ev.end_date) return { label: 'Completed', color: '#64748B', bg: '#F1F5F9' }
    if (now >= ev.start_date) return { label: 'Active', color: '#059669', bg: '#ECFDF5' }
    return { label: 'Upcoming', color: '#D97706', bg: '#FFFBEB' }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Loading events...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0F172A' }}>Events</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>{events.length} event{events.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => navigate('/events/new')} style={{
          border: 'none', borderRadius: 10, background: org?.primary_color || '#0F766E', color: '#fff',
          padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: font,
        }}>+ New event</button>
      </div>

      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p style={{ color: '#64748B', fontSize: 15 }}>No events yet. Create your first event to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {events.map(ev => {
            const status = getStatus(ev)
            const pCount = ev.participants?.[0]?.count || 0
            const aCount = ev.attendance?.[0]?.count || 0
            return (
              <div key={ev.id} onClick={() => navigate(`/events/${ev.id}`)} style={{
                background: '#fff', borderRadius: 14, padding: 20, cursor: 'pointer',
                border: '1px solid #E2E8F0', transition: 'box-shadow 0.15s',
              }} onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,23,42,.08)'}
                 onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>{ev.name}</div>
                    <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                      {ev.start_date} • {ev.num_days} day{ev.num_days !== 1 ? 's' : ''} • {pCount} participant{pCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                    color: status.color, background: status.bg,
                  }}>{status.label}</span>
                </div>
                {aCount > 0 && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#94A3B8' }}>{aCount} attendance record{aCount !== 1 ? 's' : ''}</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
