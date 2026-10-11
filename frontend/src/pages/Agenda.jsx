import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const PALETTE = [
  '#5c7f9c', '#c17a4a', '#6f8f6a', '#b5482f', '#ab9bc9',
  '#cf9a55', '#8bbdb8', '#9c8ba0', '#a9673f', '#1c1a16',
]
const TASK_COLOR = '#7c9a5c'

const emptyForm = { title: '', date: '', start_time: '', end_time: '', notes: '', color: PALETTE[0] }

// Dates en heure locale (toISOString décalerait d'un jour selon le fuseau).
function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function daysFromToday(iso) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((fromISO(iso) - today) / (1000 * 60 * 60 * 24))
}

function dayHeading(iso) {
  const date = fromISO(iso)
  const label = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const diff = daysFromToday(iso)
  let relative = ''
  if (diff === 0) relative = "Aujourd'hui"
  else if (diff === 1) relative = 'Demain'
  else if (diff > 1) relative = `Dans ${diff} jours`
  else relative = diff === -1 ? 'Hier' : `Il y a ${-diff} jours`
  return { label, relative }
}

function timeLabel(item) {
  if (!item.start) return 'Toute la journée'
  return item.end ? `${item.start} → ${item.end}` : item.start
}

function compareItems(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1
  if (a.start !== b.start) return (a.start || '') < (b.start || '') ? -1 : 1
  return a.kind === b.kind ? 0 : a.kind === 'event' ? -1 : 1
}

export default function Agenda() {
  const [events, setEvents] = useState([])
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState('')
  const [view, setView] = useState('liste')
  const todayISO = toISO(new Date())
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedDate, setSelectedDate] = useState(todayISO)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const loadEvents = () => api.get('/events').then(setEvents).catch((e) => setError(e.message))
  const loadTasks = () => api.get('/tasks').then(setTasks).catch((e) => setError(e.message))

  useEffect(() => {
    loadEvents()
    loadTasks()
  }, [])

  // Événements + échéances de la To-Do (lecture seule), dans une même liste.
  const items = useMemo(() => {
    const fromEvents = events.map((e) => ({
      kind: 'event',
      key: `e${e.id}`,
      date: e.date,
      start: e.start_time || '',
      end: e.end_time || '',
      title: e.title,
      notes: e.notes,
      color: e.color,
      raw: e,
    }))
    const fromTasks = tasks
      .filter((t) => !t.done && t.due_date)
      .map((t) => ({
        kind: 'task',
        key: `t${t.id}`,
        date: t.due_date,
        start: '',
        end: '',
        title: t.title,
        notes: null,
        color: TASK_COLOR,
      }))
    return [...fromEvents, ...fromTasks].sort(compareItems)
  }, [events, tasks])

  const upcoming = useMemo(() => items.filter((i) => i.date >= todayISO), [items, todayISO])

  const next30Count = useMemo(
    () => upcoming.filter((i) => daysFromToday(i.date) <= 30).length,
    [upcoming]
  )

  const upcomingGroups = useMemo(() => {
    const groups = []
    for (const item of upcoming) {
      const last = groups[groups.length - 1]
      if (last && last.date === item.date) last.items.push(item)
      else groups.push({ date: item.date, items: [item] })
    }
    return groups
  }, [upcoming])

  const itemsByDate = useMemo(() => {
    const map = new Map()
    for (const item of items) {
      if (!map.has(item.date)) map.set(item.date, [])
      map.get(item.date).push(item)
    }
    return map
  }, [items])

  // Cases du mois affiché (semaine commençant le lundi).
  const monthCells = useMemo(() => {
    const { year, month } = cursor
    const offset = (new Date(year, month, 1).getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < offset; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(toISO(new Date(year, month, d)))
    return cells
  }, [cursor])

  const shiftMonth = (delta) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  const goToday = () => {
    const now = new Date()
    setCursor({ year: now.getFullYear(), month: now.getMonth() })
    setSelectedDate(toISO(now))
  }

  const openNew = (date) => {
    setEditingId(null)
    setForm({ ...emptyForm, date: date || selectedDate || todayISO })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openEdit = (item) => {
    if (item.kind !== 'event') return
    const e = item.raw
    setEditingId(e.id)
    setForm({
      title: e.title,
      date: e.date,
      start_time: e.start_time || '',
      end_time: e.end_time || '',
      notes: e.notes || '',
      color: e.color,
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const cycleColor = () => {
    const idx = PALETTE.indexOf(form.color)
    setForm({ ...form, color: PALETTE[(idx + 1) % PALETTE.length] })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.date) return
    setError('')
    const payload = {
      title: form.title.trim(),
      date: form.date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      notes: form.notes.trim() || null,
      color: form.color,
    }
    try {
      if (editingId) await api.put(`/events/${editingId}`, payload)
      else await api.post('/events', payload)
      setSelectedDate(form.date)
      const d = fromISO(form.date)
      setCursor({ year: d.getFullYear(), month: d.getMonth() })
      closeForm()
      loadEvents()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer cet événement ?')) return
    await api.del(`/events/${id}`)
    if (editingId === id) closeForm()
    loadEvents()
  }

  const renderItem = (item) => {
    const body = (
      <>
        <span className="agenda-item-bar" style={{ background: item.color }} />
        <span className="agenda-item-time">{timeLabel(item)}</span>
        <span className="agenda-item-main">
          <span className="agenda-item-title">{item.title}</span>
          {item.notes && <span className="agenda-item-notes">{item.notes}</span>}
        </span>
        {item.kind === 'task' && <span className="agenda-item-tag">To-Do</span>}
      </>
    )
    if (item.kind === 'task') {
      return (
        <Link className="agenda-item task" key={item.key} to="/todo">
          {body}
        </Link>
      )
    }
    return (
      <div className="agenda-item" key={item.key} onClick={() => openEdit(item)}>
        {body}
      </div>
    )
  }

  const selectedItems = itemsByDate.get(selectedDate) || []

  return (
    <section>
      <PageHeader
        kicker={`${events.length} événements · Agenda`}
        title="Mon agenda."
        description="Ce qui est prévu dans les jours et les mois à venir, avec les échéances de ta to-do."
        statNumber={next30Count}
        statLabel="à venir · 30 jours"
      />

      <hr className="page-rule" />

      <div className="agenda-toolbar">
        <div className="repertoire-toggle-group">
          <button type="button" className={view === 'liste' ? 'active' : ''} onClick={() => setView('liste')}>
            À venir
          </button>
          <button type="button" className={view === 'mois' ? 'active' : ''} onClick={() => setView('mois')}>
            Mois
          </button>
        </div>
        <button type="button" onClick={() => openNew()}>+ Événement</button>
      </div>

      {error && <p className="error">{error}</p>}

      {showForm && (
        <div className="vocab-panel agenda-panel">
          <button className="vocab-panel-close" type="button" onClick={closeForm}>✕</button>
          <div className="vocab-panel-title">{editingId ? "Modifier l'événement" : 'Nouvel événement'}</div>
          <form onSubmit={submit}>
            <div className="modal-fields-inline">
              <div>
                <span className="field-label">Titre</span>
                <input
                  className="field-input"
                  placeholder="Rendez-vous, mariage, voyage..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <span className="field-label">Couleur</span>
                <button
                  type="button"
                  className="cal168-color-swatch-btn"
                  style={{ background: form.color }}
                  onClick={cycleColor}
                  aria-label="Changer la couleur"
                />
              </div>
            </div>

            <div className="agenda-form-row">
              <div>
                <span className="field-label">Date</span>
                <input
                  type="date"
                  className="field-input"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <span className="field-label">Début</span>
                <input
                  type="time"
                  className="field-input"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </div>
              <div>
                <span className="field-label">Fin</span>
                <input
                  type="time"
                  className="field-input"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="field-block">
              <span className="field-label">Notes</span>
              <textarea
                className="field-textarea"
                rows={2}
                placeholder="Lieu, détails à ne pas oublier..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="modal-actions">
              <button type="submit">Enregistrer</button>
              <button type="button" className="secondary" onClick={closeForm}>Annuler</button>
              {editingId && (
                <button type="button" className="danger" onClick={() => remove(editingId)}>Supprimer</button>
              )}
            </div>
          </form>
        </div>
      )}

      {view === 'liste' && (
        <div className="agenda-list">
          {upcomingGroups.length === 0 && (
            <p className="home-empty">Rien de prévu pour l'instant. Ajoute un événement avec « + Événement ».</p>
          )}
          {upcomingGroups.map((group) => {
            const { label, relative } = dayHeading(group.date)
            return (
              <div className="agenda-day" key={group.date}>
                <div className="agenda-day-heading">
                  <span className="agenda-day-label">{label}</span>
                  <span className="agenda-day-relative">{relative}</span>
                </div>
                <div className="agenda-day-items">{group.items.map(renderItem)}</div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'mois' && (
        <div className="agenda-month">
          <div className="agenda-month-header">
            <button type="button" className="agenda-nav-btn" onClick={() => shiftMonth(-1)} aria-label="Mois précédent">‹</button>
            <div className="agenda-month-title serif-italic">
              {MONTHS[cursor.month]} {cursor.year}
            </div>
            <button type="button" className="agenda-nav-btn" onClick={() => shiftMonth(1)} aria-label="Mois suivant">›</button>
            <button type="button" className="secondary agenda-today-btn" onClick={goToday}>Aujourd'hui</button>
          </div>

          <div className="agenda-grid">
            {WEEKDAYS.map((w, i) => (
              <div className="agenda-weekday" key={i}>{w}</div>
            ))}
            {monthCells.map((iso, i) => {
              if (!iso) return <div className="agenda-cell empty" key={`e${i}`} />
              const dayItems = itemsByDate.get(iso) || []
              const classes = ['agenda-cell']
              if (iso === todayISO) classes.push('today')
              if (iso === selectedDate) classes.push('selected')
              return (
                <button
                  type="button"
                  className={classes.join(' ')}
                  key={iso}
                  onClick={() => setSelectedDate(iso)}
                  aria-label={`${fromISO(iso).getDate()} ${MONTHS[cursor.month]}, ${dayItems.length} élément(s)`}
                >
                  <span className="agenda-cell-number">{fromISO(iso).getDate()}</span>
                  <span className="agenda-cell-dots">
                    {dayItems.slice(0, 4).map((it) => (
                      <span className="agenda-dot" key={it.key} style={{ background: it.color }} />
                    ))}
                  </span>
                  {dayItems.slice(0, 2).map((it) => (
                    <span className="agenda-cell-title" key={it.key} style={{ borderLeftColor: it.color }}>
                      {it.title}
                    </span>
                  ))}
                  {dayItems.length > 2 && <span className="agenda-cell-more">+{dayItems.length - 2}</span>}
                </button>
              )
            })}
          </div>

          <div className="agenda-selected">
            <div className="agenda-day-heading">
              <span className="agenda-day-label">{dayHeading(selectedDate).label}</span>
              <button type="button" className="secondary" onClick={() => openNew(selectedDate)}>+ Ajouter ce jour</button>
            </div>
            {selectedItems.length === 0 ? (
              <p className="home-empty">Rien de prévu ce jour-là.</p>
            ) : (
              <div className="agenda-day-items">{selectedItems.map(renderItem)}</div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
