import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'

const STATUSES = [
  { value: 'a_lire', label: 'À lire' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'lu', label: 'Lu' },
]

const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.value, s.label]))

const emptyForm = {
  title: '',
  author: '',
  status: 'a_lire',
  rating: '',
  started_at: '',
  finished_at: '',
  notes: '',
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function Lecture() {
  const [books, setBooks] = useState([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const load = () => api.get('/books').then(setBooks).catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const columns = useMemo(() => {
    return STATUSES.map((s) => ({
      ...s,
      list: books.filter((b) => b.status === s.value),
    }))
  }, [books])

  const openNew = (status) => {
    setEditingId(null)
    setForm({ ...emptyForm, status: status || 'a_lire' })
    setShowForm(true)
  }

  const openEdit = (book) => {
    setEditingId(book.id)
    setForm({
      title: book.title,
      author: book.author || '',
      status: book.status,
      rating: book.rating || '',
      started_at: book.started_at || '',
      finished_at: book.finished_at || '',
      notes: book.notes || '',
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setError('')
    const payload = {
      title: form.title.trim(),
      author: form.author.trim() || null,
      status: form.status,
      rating: form.rating ? Number(form.rating) : null,
      started_at: form.started_at || null,
      finished_at: form.finished_at || null,
      notes: form.notes.trim() || null,
    }
    try {
      if (editingId) {
        await api.put(`/books/${editingId}`, payload)
      } else {
        await api.post('/books', payload)
      }
      closeForm()
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const changeStatus = async (book, status) => {
    setError('')
    const patch = { status }
    if (status === 'en_cours' && !book.started_at) patch.started_at = today()
    if (status === 'lu' && !book.finished_at) patch.finished_at = today()
    try {
      await api.put(`/books/${book.id}`, patch)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer ce livre ?')) return
    await api.del(`/books/${id}`)
    if (editingId === id) closeForm()
    load()
  }

  const readCount = books.filter((b) => b.status === 'lu').length

  return (
    <section>
      <PageHeader
        kicker={`${books.length} livres · Bibliothèque perso`}
        title="Mes lectures."
        description="Ce que je lis, ce que j'ai lu, ce qui attend son tour."
        statNumber={readCount}
        statLabel="livres lus"
      />

      <hr className="page-rule" />

      {error && <p className="error">{error}</p>}

      {showForm && (
        <div className="vocab-panel">
          <button className="vocab-panel-close" type="button" onClick={closeForm}>✕</button>
          <div className="vocab-panel-title">{editingId ? 'Modifier le livre' : 'Ajouter un livre'}</div>
          <form onSubmit={submit}>
            <div className="modal-fields-inline">
              <div>
                <span className="field-label">Titre</span>
                <input
                  className="field-input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <span className="field-label">Auteur</span>
                <input
                  className="field-input"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                />
              </div>
            </div>

            <div className="field-block">
              <span className="field-label">Statut</span>
              <div className="category-pills">
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    className={form.status === s.value ? 'active' : ''}
                    onClick={() => setForm({ ...form, status: s.value })}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-fields-inline">
              <div>
                <span className="field-label">Commencé le</span>
                <input
                  type="date"
                  className="field-input"
                  value={form.started_at}
                  onChange={(e) => setForm({ ...form, started_at: e.target.value })}
                />
              </div>
              <div>
                <span className="field-label">Terminé le</span>
                <input
                  type="date"
                  className="field-input"
                  value={form.finished_at}
                  onChange={(e) => setForm({ ...form, finished_at: e.target.value })}
                />
              </div>
            </div>

            <div className="field-block">
              <span className="field-label">Note (sur 5, optionnel)</span>
              <input
                type="number"
                min="1"
                max="5"
                className="field-input"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
              />
            </div>

            <div className="field-block">
              <span className="field-label">Notes</span>
              <textarea
                className="field-textarea"
                rows={3}
                placeholder="Ce que tu retiens, une citation, une impression..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            {error && <p className="error">{error}</p>}

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

      <div className="lecture-board">
        {columns.map((col) => (
          <div className="lecture-column" key={col.value}>
            <div className="lecture-column-header">
              <span>{col.label} · {col.list.length}</span>
              <button type="button" className="lecture-add-btn" onClick={() => openNew(col.value)}>+</button>
            </div>
            <div className="lecture-cards">
              {col.list.map((book) => (
                <div className="lecture-card" key={book.id} onClick={() => openEdit(book)}>
                  <div className="lecture-card-title serif-italic">{book.title}</div>
                  {book.author && <div className="lecture-card-author">{book.author}</div>}
                  {book.rating && (
                    <div className="lecture-card-rating">{'★'.repeat(book.rating)}{'☆'.repeat(5 - book.rating)}</div>
                  )}
                  {book.status !== 'lu' && (
                    <select
                      className="lecture-status-select"
                      value={book.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => changeStatus(book, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{STATUS_LABEL[s.value]}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
              {col.list.length === 0 && <p className="lecture-empty">Rien ici.</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
