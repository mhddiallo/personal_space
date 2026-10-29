import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'

const emptyForm = {
  title: '',
  arabic: '',
  transliteration: '',
  translation: '',
  source: '',
  repetitions: '',
}

export default function Prieres() {
  const [duas, setDuas] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [reading, setReading] = useState(false)
  const [readingIndex, setReadingIndex] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()

  const load = () =>
    api
      .get('/duas')
      .then(setDuas)
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true))

  useEffect(() => {
    load()
  }, [])

  const startReading = useCallback(() => {
    setReadingIndex(0)
    setReading(true)
  }, [])

  const stopReading = useCallback(() => {
    setReading(false)
    if (searchParams.has('lire')) {
      const next = new URLSearchParams(searchParams)
      next.delete('lire')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Lien direct depuis l'Accueil : /prieres?lire=1 ouvre tout de suite le mode lecture.
  useEffect(() => {
    if (loaded && duas.length > 0 && searchParams.get('lire') === '1') startReading()
  }, [loaded, duas.length, searchParams, startReading])

  // ----- Formulaire -----

  const openNew = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (dua) => {
    setEditingId(dua.id)
    setForm({
      title: dua.title,
      arabic: dua.arabic,
      transliteration: dua.transliteration || '',
      translation: dua.translation || '',
      source: dua.source || '',
      repetitions: dua.repetitions || '',
    })
    setShowForm(true)
  }

  const closeForm = useCallback(() => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }, [])

  useEffect(() => {
    if (!showForm) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') closeForm()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showForm, closeForm])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.arabic.trim()) return
    setError('')
    const payload = {
      title: form.title.trim(),
      arabic: form.arabic.trim(),
      transliteration: form.transliteration.trim() || null,
      translation: form.translation.trim() || null,
      source: form.source.trim() || null,
      repetitions: form.repetitions.trim() || null,
    }
    try {
      if (editingId) await api.put(`/duas/${editingId}`, payload)
      else await api.post('/duas', payload)
      closeForm()
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer cette dua ?')) return
    try {
      await api.del(`/duas/${id}`)
      closeForm()
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  // L'ordre de la liste est l'ordre de lecture après la salat.
  const move = async (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= duas.length) return
    const next = [...duas]
    ;[next[index], next[target]] = [next[target], next[index]]
    setDuas(next)
    try {
      await api.post('/duas/reorder', { ids: next.map((d) => d.id) })
    } catch (err) {
      setError(err.message)
      load()
    }
  }

  return (
    <section>
      <PageHeader
        kicker={`${duas.length} duas · Après la salat`}
        title="Mes prières."
        description="Les duas à lire après chaque salat, dans l'ordre. Le texte en arabe, sa traduction et sa source."
        statNumber={duas.length}
        statLabel="duas"
      />

      <hr className="page-rule" />

      <div className="agenda-toolbar">
        <button type="button" onClick={startReading} disabled={duas.length === 0}>
          ▶ Lire après la salat
        </button>
        <button type="button" className="secondary" onClick={openNew}>+ Dua</button>
      </div>

      {error && <p className="error">{error}</p>}

      {loaded && duas.length === 0 && (
        <div className="week-empty">
          <p>Tu n'as pas encore ajouté de dua. Ajoute celles que tu lis après chaque salat : le texte en arabe, la traduction en français et la source (le hadith ou le verset).</p>
          <div className="modal-actions">
            <button type="button" onClick={openNew}>Ajouter ma première dua</button>
          </div>
        </div>
      )}

      <div className="dua-list">
        {duas.map((dua, index) => (
          <article className="dua-card" key={dua.id}>
            <header className="dua-card-header">
              <div className="dua-card-title">
                <span className="dua-number">{index + 1}</span>
                <h3>{dua.title}</h3>
                {dua.repetitions && <span className="dua-reps">{dua.repetitions}</span>}
              </div>
              <div className="dua-card-actions">
                <button type="button" className="sec-icon-btn" aria-label="Monter" disabled={index === 0} onClick={() => move(index, -1)}>▲</button>
                <button type="button" className="sec-icon-btn" aria-label="Descendre" disabled={index === duas.length - 1} onClick={() => move(index, 1)}>▼</button>
                <button type="button" className="secondary sec-edit-btn" onClick={() => openEdit(dua)}>Modifier</button>
              </div>
            </header>
            <p className="dua-arabic" dir="rtl" lang="ar">{dua.arabic}</p>
            {dua.transliteration && <p className="dua-translit">{dua.transliteration}</p>}
            {dua.translation && <p className="dua-translation">{dua.translation}</p>}
            {dua.source && <p className="dua-source">Source : {dua.source}</p>}
          </article>
        ))}
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={closeForm}>
          <div className="modal-card dua-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" type="button" onClick={closeForm} aria-label="Fermer">✕</button>
            <div className="modal-title">{editingId ? 'Modifier la dua' : 'Nouvelle dua'}</div>
            <form onSubmit={submit}>
              <div className="agenda-form-row dua-form-top">
                <div>
                  <span className="field-label">Titre</span>
                  <input
                    className="field-input"
                    placeholder="ex : Istighfar après la salat"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <span className="field-label">Répétitions (facultatif)</span>
                  <input
                    className="field-input"
                    placeholder="ex : 3 fois"
                    value={form.repetitions}
                    onChange={(e) => setForm({ ...form, repetitions: e.target.value })}
                  />
                </div>
              </div>

              <div className="field-block">
                <span className="field-label">Texte en arabe</span>
                <textarea
                  className="field-textarea dua-arabic-input"
                  dir="rtl"
                  lang="ar"
                  rows={4}
                  placeholder="الصق النص هنا"
                  value={form.arabic}
                  onChange={(e) => setForm({ ...form, arabic: e.target.value })}
                  required
                />
              </div>

              <div className="field-block">
                <span className="field-label">Translittération (facultatif)</span>
                <textarea
                  className="field-textarea"
                  rows={2}
                  value={form.transliteration}
                  onChange={(e) => setForm({ ...form, transliteration: e.target.value })}
                />
              </div>

              <div className="field-block">
                <span className="field-label">Traduction en français</span>
                <textarea
                  className="field-textarea"
                  rows={3}
                  value={form.translation}
                  onChange={(e) => setForm({ ...form, translation: e.target.value })}
                />
              </div>

              <div className="field-block">
                <span className="field-label">Source</span>
                <input
                  className="field-input"
                  placeholder="ex : Sahih Muslim 591, ou Coran 2:255"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
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
        </div>
      )}

      {reading && duas.length > 0 && (
        <ReadingMode
          duas={duas}
          index={Math.min(readingIndex, duas.length - 1)}
          setIndex={setReadingIndex}
          onClose={stopReading}
        />
      )}
    </section>
  )
}

// Mode lecture plein écran : une dua à la fois, grand texte arabe, pour après chaque salat.
function ReadingMode({ duas, index, setIndex, onClose }) {
  const dua = duas[index]
  const isLast = index === duas.length - 1
  const touchStart = useRef(null)

  const next = useCallback(() => {
    if (isLast) onClose()
    else setIndex(index + 1)
  }, [isLast, index, onClose, setIndex])

  const prev = useCallback(() => {
    if (index > 0) setIndex(index - 1)
  }, [index, setIndex])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [next, prev, onClose])

  const onTouchEnd = (e) => {
    if (touchStart.current === null) return
    const dx = e.changedTouches[0].clientX - touchStart.current
    touchStart.current = null
    if (Math.abs(dx) < 60) return
    if (dx < 0) next()
    else prev()
  }

  return (
    <div
      className="dua-reader"
      role="dialog"
      aria-label="Lecture des duas"
      onTouchStart={(e) => { touchStart.current = e.touches[0].clientX }}
      onTouchEnd={onTouchEnd}
    >
      <div className="dua-reader-top">
        <span className="dua-reader-count">{index + 1} / {duas.length}</span>
        <button type="button" className="dua-reader-close" onClick={onClose} aria-label="Fermer la lecture">✕</button>
      </div>

      <div className="dua-reader-body">
        <h2 className="dua-reader-title">
          {dua.title}
          {dua.repetitions && <span className="dua-reps">{dua.repetitions}</span>}
        </h2>
        <p className="dua-reader-arabic" dir="rtl" lang="ar">{dua.arabic}</p>
        {dua.transliteration && <p className="dua-translit">{dua.transliteration}</p>}
        {dua.translation && <p className="dua-translation">{dua.translation}</p>}
        {dua.source && <p className="dua-source">Source : {dua.source}</p>}
      </div>

      <div className="dua-reader-dots" aria-hidden="true">
        {duas.map((d, i) => (
          <span key={d.id} className={`dua-dot${i === index ? ' on' : i < index ? ' past' : ''}`} />
        ))}
      </div>

      <div className="dua-reader-nav">
        <button type="button" className="secondary" onClick={prev} disabled={index === 0}>‹ Précédente</button>
        <button type="button" onClick={next}>{isLast ? 'Terminé ✓' : 'Suivante ›'}</button>
      </div>
    </div>
  )
}
