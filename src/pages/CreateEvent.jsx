async function handleSubmit(e) {
  e.preventDefault()
  setError('')
  setLoading(true)

  try {
    const eventCode = `${name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)}-${generateCode()}`

    const payload = {
      org_id: org.id,
      name,                 // required by your DB
      event_name: name,     // compatibility field
      start_date: startDate,
      end_date: endDate || startDate,
      days: Number(numDays || 1),
      status: 'active',
      event_code: eventCode,
      created_by: user.id,
    }

    const { data, error: err } = await supabase
      .from('events')
      .insert(payload)
      .select()
      .single()

    if (err) throw err

    await supabase.from('audit_log').insert({
      org_id: org.id,
      user_id: user.id,
      action: 'event_created',
      detail: { event_id: data.id, event_name: name }
    })

    navigate(`/events/${data.id}`)
  } catch (err) {
    setError(err.message || 'Failed to create event')
    console.error(err)
  } finally {
    setLoading(false)
  }
}
