import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MONTHS_FULL = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]
const MONTHS_SHORT = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEP', 'OCT', 'NOV', 'DÉC']

const MOODS = ['rose', 'ambre', 'jaune', 'vert', 'bleu', 'violet']

const TAGS = [
  'Ce qui a bien marché',
  'À améliorer',
  'Gratitude',
  'Leçon du jour',
  'Intention',
  "Du'a",
]

const today = () => new Date().toISOString().slice(0, 10)

function parseDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function weekdayOf(isoDate) {
  return WEEKDAYS[parseDate(isoDate).getDay()]
}

function dayNumber(isoDate) {
  return String(parseDate(isoDate).getDate()).padStart(2, '0')
}

function monthShort(isoDate) {
  return MONTHS_SHORT[parseDate(isoDate).getMonth()]
}

function editorTitle(isoDate) {
  const d = parseDate(isoDate)
  return `${WEEKDAYS[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')} ${MONTHS_FULL[d.getMonth()]}`
}

function wordCount(text) {
  const trimmed = (text || '').trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

function timeOf(isoDatetime) {
  if (!isoDatetime) return null
  const d = new Date(isoDatetime)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const draftFor = (date) => ({
  id: null,
  title: '',
  content: '',
  entry_date: date,
  tag: null,
  mood: null,
  private: false,
  updated_at: null,
})

export default function Journal() {
  const [entries, setEntries] = useState([])
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const load = () =>
    api.get('/journal').then((data) => {
      setEntries(data)
      return data
    }).catch((e) => setError(e.message))

  useEffect(() => {
    load().then((data) => {
      if (data && data.length > 0) setEditing({ ...data[0] })
      else setEditing(draftFor(today()))
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  const openToday = () => {
    const existing = entries.find((e) => e.entry_date === today())
    setEditing(existing ? { ...existing } : draftFor(today()))
  }

  const select = (entry) => setEditing({ ...entry })

  const save = async () => {
    if (!editing) return
    setError('')
    const payload = {
      title: editing.title || null,
      content: editing.content,
      entry_date: editing.entry_date,
      tag: editing.tag,
      mood: editing.mood,
      private: editing.private,
    }
    try {
      let saved
      if (editing.id) {
        saved = await api.put(`/journal/${editing.id}`, payload)
      } else {
        saved = await api.post('/journal', payload)
      }
      setEditing({ ...saved })
      const data = await load()
      if (data) {
        const fresh = data.find((e) => e.id === saved.id)
        if (fresh) setEditing({ ...fresh })
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer cette entrée du journal ?')) return
    await api.del(`/journal/${id}`)
    const data = await load()
    if (data && data.length > 0) setEditing({ ...data[0] })
    else setEditing(draftFor(today()))
  }

  const yearCount = useMemo(() => {
    const year = new Date().getFullYear()
    return entries.filter((e) => parseDate(e.entry_date).getFullYear() === year).length
  }, [entries])

  if (!editing) return null

  return (
    <section>
      <PageHeader
        kicker={`Carnet personnel · ${new Date().getFullYear()}`}
        title="Mon journal."
        description="Écrire 5 minutes par jour. Ne pas chercher la profondeur — la chercher revient à la perdre. Juste poser ce qui est là."
        statNumber={yearCount}
        statLabel={`jours d'écriture · ${new Date().getFullYear()}`}
      />
      <hr className="page-rule" />

      {error && <p className="error">{error}</p>}

      <div className="journal-layout">
        <div className="journal-list-panel">
          <div className="journal-list-header">
            <span className="kicker">Entrées</span>
            <button type="button" onClick={openToday}>+ Aujourd'hui</button>
          </div>
          <ul className="journal-list">
            {entries.length === 0 && <li className="journal-empty">Aucune entrée pour l'instant.</li>}
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={`journal-list-item${editing.id === entry.id ? ' active' : ''}`}
                onClick={() => select(entry)}
              >
                <div className="journal-list-day">
                  <div className="journal-list-day-number serif-italic">{dayNumber(entry.entry_date)}</div>
                  <div className="journal-list-day-month">{monthShort(entry.entry_date)}</div>
                </div>
                <div className="journal-list-body">
                  <div className="journal-list-kicker">
                    {entry.mood && <span className="mood-dot" style={{ background: `var(--mood-${entry.mood})` }} />}
                    <span>
                      {weekdayOf(entry.entry_date)}
                      {entry.tag ? ` · ${entry.tag}` : ''}
                    </span>
                  </div>
                  <div className="journal-list-preview">{entry.content}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="journal-editor">
          <div className="journal-editor-header">
            <h2 className="journal-editor-title">{editorTitle(editing.entry_date)}</h2>
            <div>
              <div className="mood-picker-label">Humeur</div>
              <div className="mood-picker">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={editing.mood === m ? 'active' : ''}
                    style={{ background: `var(--mood-${m})` }}
                    onClick={() => setEditing({ ...editing, mood: editing.mood === m ? null : m })}
                    aria-label={m}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="journal-editor-meta">
            {wordCount(editing.content)} mots
            {editing.updated_at && ` · Dernière sauvegarde ${timeOf(editing.updated_at)}`}
          </div>

          <div className="journal-tags">
            {TAGS.map((t) => (
              <button
                key={t}
                type="button"
                className={editing.tag === t ? 'active' : ''}
                onClick={() => setEditing({ ...editing, tag: editing.tag === t ? null : t })}
              >
                {t}
              </button>
            ))}
          </div>

          <textarea
            className="journal-content-area"
            value={editing.content}
            placeholder="Écris ce que tu veux garder de cette journée..."
            onChange={(e) => setEditing({ ...editing, content: e.target.value })}
          />

          <div className="journal-editor-footer">
            <button type="button" onClick={save}>Sauvegarder</button>
            <button
              type="button"
              className={`private-toggle${editing.private ? ' active' : ''}`}
              onClick={() => setEditing({ ...editing, private: !editing.private })}
            >
              Marquer comme privé
            </button>
            {editing.id && (
              <button type="button" className="danger" onClick={() => remove(editing.id)}>
                Supprimer
              </button>
            )}
            <span className="journal-save-hint">Cmd+S pour enregistrer</span>
          </div>
        </div>
      </div>
    </section>
  )
}
