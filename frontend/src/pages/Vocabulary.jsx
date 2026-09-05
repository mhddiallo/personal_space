import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'

const LANGUAGES = ['Français', 'Anglais', 'Arabe', 'Wolof', 'Grec ancien', 'Portugais', 'Japonais']

const TYPES = [
  { value: 'mot', label: 'Mot' },
  { value: 'expression', label: 'Expression' },
]

const DAILY_GOAL = 12

const emptyForm = {
  type: 'mot',
  term: '',
  language: 'Français',
  nature: '',
  author: '',
  definition: '',
  source: '',
}

export default function Vocabulary() {
  const [entries, setEntries] = useState([])
  const [error, setError] = useState('')
  const [view, setView] = useState('library') // 'library' | 'flashcards' | 'new'
  const [langFilter, setLangFilter] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const load = () => api.get('/vocabulary').then(setEntries).catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const openNew = () => {
    resetForm()
    setView('new')
  }

  const openEdit = (entry) => {
    setEditingId(entry.id)
    setForm({
      type: entry.type || 'mot',
      term: entry.term,
      language: entry.language || 'Français',
      nature: entry.nature || '',
      author: entry.author || '',
      definition: entry.definition,
      source: entry.source || '',
    })
    setView('new')
  }

  const closeForm = () => {
    resetForm()
    setView('library')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const payload = {
      type: form.type,
      term: form.term,
      language: form.language,
      nature: form.type === 'mot' ? (form.nature || null) : null,
      author: form.type === 'expression' ? (form.author || null) : null,
      definition: form.definition,
      source: form.source || null,
    }
    try {
      if (editingId) {
        await api.put(`/vocabulary/${editingId}`, payload)
      } else {
        await api.post('/vocabulary', payload)
      }
      closeForm()
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer cette entrée ?')) return
    await api.del(`/vocabulary/${id}`)
    if (editingId === id) closeForm()
    load()
  }

  const languages = useMemo(() => {
    const seen = []
    entries.forEach((e) => {
      if (e.language && !seen.includes(e.language)) seen.push(e.language)
    })
    return seen
  }, [entries])

  const visible = useMemo(() => {
    if (langFilter === 'all') return entries
    return entries.filter((e) => e.language === langFilter)
  }, [entries, langFilter])

  const reviewedToday = useMemo(() => entries.filter((e) => e.reviewed_today).length, [entries])

  return (
    <section>
      <PageHeader
        kicker={`${entries.length} entrées · ${languages.length} langues`}
        title="Mon vocabulaire."
        description="Chaque mot ou expression rencontré, sa définition, sa langue, sa source. Réviser quelques cartes par jour — la mémoire est un muscle qui s'entretient."
        statNumber={`${reviewedToday}/${DAILY_GOAL}`}
        statLabel="cartes révisées aujourd'hui"
      />

      <hr className="page-rule" />

      <div className="vocab-toolbar">
        <div className="vocab-view-tabs">
          <button className={view === 'library' ? 'active' : ''} type="button" onClick={() => setView('library')}>
            Bibliothèque
          </button>
          <button className={view === 'flashcards' ? 'active' : ''} type="button" onClick={() => setView('flashcards')}>
            Flashcards
          </button>
          <button className={view === 'new' ? 'active' : ''} type="button" onClick={openNew}>
            + Nouveau mot
          </button>
        </div>
        {view === 'library' && languages.length > 0 && (
          <div className="vocab-lang-pills">
            <button className={langFilter === 'all' ? 'active' : ''} type="button" onClick={() => setLangFilter('all')}>
              Toutes
            </button>
            {languages.map((lang) => (
              <button
                key={lang}
                className={langFilter === lang ? 'active' : ''}
                type="button"
                onClick={() => setLangFilter(lang)}
              >
                {lang}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {view === 'library' && (
        <div className="vocab-cards">
          {visible.length === 0 && <p className="repertoire-empty">Aucune entrée pour l'instant.</p>}
          {visible.map((entry) => (
            <div className="vocab-card" key={entry.id} onClick={() => openEdit(entry)}>
              <div className="vocab-card-header">
                <div className="vocab-term serif-italic">{entry.term}</div>
                <span className="vocab-language-badge">{entry.language}</span>
              </div>
              <div className="vocab-nature">
                {entry.type === 'expression'
                  ? `Expression${entry.author ? ` — ${entry.author}` : ''}`
                  : entry.nature || 'Mot'}
              </div>
              <p className="vocab-definition">{entry.definition}</p>
              <div className="vocab-card-footer">
                {entry.source && <span className="vocab-source-line">{entry.source} ·</span>}
                <span className="vocab-force-label">FORCE</span>
                <span className="vocab-force-bar">
                  <span className="vocab-force-fill" style={{ width: `${entry.mastery}%` }} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'flashcards' && (
        <p className="vocab-placeholder">Le mode Flashcards arrive bientôt.</p>
      )}

      {view === 'new' && (
        <div className="vocab-panel">
          <button className="vocab-panel-close" type="button" onClick={closeForm}>✕</button>
          <div className="vocab-panel-title">
            {editingId
              ? (form.type === 'expression' ? "Modifier l'expression" : 'Modifier le mot')
              : (form.type === 'expression' ? 'Ajouter une nouvelle expression' : 'Ajouter un nouveau mot')}
          </div>

          <form onSubmit={submit}>
            <div className="field-block">
              <span className="field-label">Type</span>
              <div className="category-pills">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    className={form.type === t.value ? 'active' : ''}
                    onClick={() => setForm({ ...form, type: t.value })}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-block">
              <span className="field-label">{form.type === 'expression' ? 'Expression' : 'Mot'}</span>
              <input
                className="field-input"
                placeholder={form.type === 'expression' ? "ex: l'occasion fait le larron" : 'ex: phronesis'}
                value={form.term}
                onChange={(e) => setForm({ ...form, term: e.target.value })}
                required
              />
            </div>

            <div className="modal-fields-inline">
              <div>
                <span className="field-label">Langue</span>
                <select
                  className="field-select"
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              {form.type === 'mot' ? (
                <div>
                  <span className="field-label">Nature</span>
                  <input
                    className="field-input"
                    placeholder="n. m. / v. / adj..."
                    value={form.nature}
                    onChange={(e) => setForm({ ...form, nature: e.target.value })}
                  />
                </div>
              ) : (
                <div>
                  <span className="field-label">Auteur</span>
                  <input
                    className="field-input"
                    placeholder="ex: Marc Aurèle, un proverbe wolof..."
                    value={form.author}
                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="field-block">
              <span className="field-label">Définition</span>
              <textarea
                className="field-textarea"
                rows={4}
                placeholder="Définition en tes propres mots, exemples si utile..."
                value={form.definition}
                onChange={(e) => setForm({ ...form, definition: e.target.value })}
                required
              />
            </div>

            <div className="field-block">
              <span className="field-label">Source</span>
              <input
                className="field-input"
                placeholder="Livre, conversation, article..."
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              />
            </div>

            {error && <p className="error">{error}</p>}

            <div className="modal-actions">
              <button type="submit">{form.type === 'expression' ? "Enregistrer l'expression" : 'Enregistrer le mot'}</button>
              <button type="button" className="secondary" onClick={closeForm}>Annuler</button>
              {editingId && (
                <button type="button" className="danger" onClick={() => remove(editingId)}>
                  Supprimer
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
