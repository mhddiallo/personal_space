import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'

const DAYS = ['LU', 'MA', 'ME', 'JE', 'VE', 'SA', 'DI']

const PALETTE = [
  '#c17a4a', '#5c7f9c', '#6f8f6a', '#a9673f', '#ab9bc9',
  '#cf9a55', '#8bbdb8', '#b5482f', '#9c8ba0', '#7c9a5c',
]

// display column c (0-23) -> real hour = (c+5) % 24, so the grid starts at 05:00
const COLS = Array.from({ length: 24 }, (_, c) => (c + 5) % 24)

function hourLabel(h) {
  if (h === 0) return '12a'
  if (h === 12) return '12p'
  if (h < 12) return `${String(h).padStart(2, '0')}a`
  return `${String(h - 12).padStart(2, '0')}p`
}

export default function Calendar168() {
  const [activities, setActivities] = useState([])
  const [cells, setCells] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [eraser, setEraser] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PALETTE[0])
  const [error, setError] = useState('')
  const paintingRef = useRef(false)

  const loadActivities = () => api.get('/calendar/activities').then(setActivities).catch((e) => setError(e.message))
  const loadCells = () => api.get('/calendar/cells').then(setCells).catch((e) => setError(e.message))

  useEffect(() => {
    loadActivities()
    loadCells()
  }, [])

  useEffect(() => {
    if (!selectedId && activities.length > 0) setSelectedId(activities[0].id)
  }, [activities, selectedId])

  useEffect(() => {
    const stop = () => { paintingRef.current = false }
    window.addEventListener('mouseup', stop)
    return () => window.removeEventListener('mouseup', stop)
  }, [])

  const cellMap = useMemo(() => {
    const map = new Map()
    for (const c of cells) map.set(`${c.day_of_week}-${c.hour}`, c)
    return map
  }, [cells])

  const activityById = useMemo(() => {
    const map = new Map()
    for (const a of activities) map.set(a.id, a)
    return map
  }, [activities])

  const hoursByActivity = useMemo(() => {
    const totals = {}
    for (const c of cells) totals[c.activity_id] = (totals[c.activity_id] || 0) + 1
    return totals
  }, [cells])

  const filledCount = cells.length

  const paintCell = async (day, hour) => {
    setError('')
    try {
      if (eraser) {
        const key = `${day}-${hour}`
        if (!cellMap.has(key)) return
        await api.del(`/calendar/cells?day_of_week=${day}&hour=${hour}`)
        setCells((prev) => prev.filter((c) => !(c.day_of_week === day && c.hour === hour)))
      } else {
        if (!selectedId) return
        const saved = await api.put('/calendar/cells', { day_of_week: day, hour, activity_id: selectedId })
        setCells((prev) => {
          const next = prev.filter((c) => !(c.day_of_week === day && c.hour === hour))
          next.push(saved)
          return next
        })
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const onCellDown = (day, hour) => {
    paintingRef.current = true
    paintCell(day, hour)
  }

  const onCellEnter = (day, hour) => {
    if (paintingRef.current) paintCell(day, hour)
  }

  const cycleColor = () => {
    const idx = PALETTE.indexOf(newColor)
    setNewColor(PALETTE[(idx + 1) % PALETTE.length])
  }

  const addActivity = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setError('')
    try {
      await api.post('/calendar/activities', { name: newName.trim(), color: newColor })
      setNewName('')
      setNewColor(PALETTE[(PALETTE.indexOf(newColor) + 1) % PALETTE.length])
      loadActivities()
    } catch (err) {
      setError(err.message)
    }
  }

  const removeActivity = async (id) => {
    if (!confirm('Supprimer cette activité et toutes ses cases ?')) return
    await api.del(`/calendar/activities/${id}`)
    if (selectedId === id) setSelectedId(null)
    loadActivities()
    loadCells()
  }

  return (
    <section>
      <PageHeader
        kicker={`${activities.length} activités · Semaine type`}
        title="168 Heures."
        description="La semaine entière, heure par heure. Choisis une activité puis peins les cases — ou efface avec la gomme."
        statNumber={`${filledCount}/168`}
        statLabel="heures planifiées"
      />

      <hr className="page-rule" />

      {error && <p className="error">{error}</p>}

      <div className="cal168-toolbar">
        <div className="cal168-chips">
          {activities.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`cal168-chip${selectedId === a.id && !eraser ? ' active' : ''}`}
              onClick={() => { setSelectedId(a.id); setEraser(false) }}
              onContextMenu={(e) => { e.preventDefault(); removeActivity(a.id) }}
              title="Clic droit pour supprimer"
            >
              <span className="cal168-chip-swatch" style={{ background: a.color }} />
              {a.icon && <span>{a.icon}</span>}
              <span>{a.name}</span>
              <span className="cal168-chip-hours">{hoursByActivity[a.id] || 0}h</span>
              <span
                className="cal168-chip-remove"
                role="button"
                aria-label={`Supprimer ${a.name}`}
                onClick={(e) => { e.stopPropagation(); removeActivity(a.id) }}
              >
                ✕
              </span>
            </button>
          ))}
          <button
            type="button"
            className={`cal168-chip cal168-gomme-btn${eraser ? ' active' : ''}`}
            onClick={() => setEraser((v) => !v)}
          >
            ⌫ Gomme
          </button>
        </div>

        <form className="cal168-add-row" onSubmit={addActivity}>
          <button type="button" className="cal168-color-swatch-btn" style={{ background: newColor }} onClick={cycleColor} aria-label="Changer la couleur" />
          <input
            className="cal168-add-input"
            placeholder="Nouvelle activité..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="submit" className="cal168-add-btn">+ Ajouter</button>
        </form>
      </div>

      <div className="cal168-grid-wrapper">
        <div className="cal168-grid" style={{ gridTemplateColumns: `40px repeat(24, 1fr)` }}>
          <div className="cal168-corner" />
          {COLS.map((h) => (
            <div key={h} className="cal168-hour-label">{hourLabel(h)}</div>
          ))}

          {DAYS.map((label, day) => (
            <Fragment key={`row-${day}`}>
              <div className="cal168-day-label">{label}</div>
              {COLS.map((h) => {
                const cell = cellMap.get(`${day}-${h}`)
                const activity = cell ? activityById.get(cell.activity_id) : null
                return (
                  <div
                    key={`c-${day}-${h}`}
                    className="cal168-cell"
                    style={{ background: activity ? activity.color : undefined }}
                    onMouseDown={() => onCellDown(day, h)}
                    onMouseEnter={() => onCellEnter(day, h)}
                    title={activity ? activity.name : undefined}
                  >
                    {activity && (
                      <span className="cal168-cell-label">
                        {activity.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>

      <p className="cal168-hint">Glisse pour peindre plusieurs cases · clic droit sur une activité pour la supprimer.</p>
    </section>
  )
}
