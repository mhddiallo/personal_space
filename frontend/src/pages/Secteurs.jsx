import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'
import starter from '../lib/sectors-starter.json'

const PALETTE = [
  '#5c7f9c', '#6f8f6a', '#c17a4a', '#cf9a55', '#b5482f',
  '#8bbdb8', '#ab9bc9', '#9c8ba0', '#a9673f', '#1c1a16',
]

const MAX_FOCUS = 3
const MAX_ACTIVE_PROJECTS = 2

const emptySectorForm = { name: '', description: '', color: PALETTE[0] }

export default function Secteurs() {
  const [sectors, setSectors] = useState([])
  const [inbox, setInbox] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [importing, setImporting] = useState(false)
  const [showSectorForm, setShowSectorForm] = useState(false)
  const [editingSectorId, setEditingSectorId] = useState(null)
  const [sectorForm, setSectorForm] = useState(emptySectorForm)
  const [inboxText, setInboxText] = useState('')
  const [addText, setAddText] = useState({})

  const loadAll = () =>
    Promise.all([api.get('/sectors').then(setSectors), api.get('/inbox').then(setInbox)])
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true))

  useEffect(() => {
    loadAll()
  }, [])

  // Le pop-up de secteur se ferme avec Échap.
  useEffect(() => {
    if (!showSectorForm) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') closeSectorForm()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showSectorForm])

  const flash = (message) => {
    setNotice(message)
    setTimeout(() => setNotice(''), 3500)
  }

  const taskStats = useMemo(() => {
    let total = 0
    let done = 0
    for (const s of sectors) {
      for (const it of s.items) {
        if (it.kind === 'project') continue
        total += 1
        if (it.done) done += 1
      }
    }
    return { total, done }
  }, [sectors])

  const focusList = useMemo(
    () =>
      sectors.flatMap((s) =>
        s.items.filter((it) => it.focus).map((it) => ({ item: it, sector: s }))
      ),
    [sectors]
  )

  const replaceItem = (updated) =>
    setSectors((prev) =>
      prev.map((s) => {
        const without = s.items.filter((it) => it.id !== updated.id)
        return s.id === updated.sector_id ? { ...s, items: [...without, updated].sort((a, b) => a.position - b.position) } : { ...s, items: without }
      })
    )

  const patchItem = async (item, patch) => {
    setError('')
    if (patch.focus && !item.focus) {
      const sector = sectors.find((s) => s.id === item.sector_id)
      const count = sector.items.filter((it) => it.focus && it.id !== item.id).length
      if (count >= MAX_FOCUS) {
        flash(`${MAX_FOCUS} priorités maximum par secteur`)
        return
      }
    }
    replaceItem({ ...item, ...patch })
    try {
      await api.put(`/sector-items/${item.id}`, patch)
    } catch (err) {
      setError(err.message)
      loadAll()
    }
  }

  const removeItem = async (item) => {
    setSectors((prev) =>
      prev.map((s) => (s.id === item.sector_id ? { ...s, items: s.items.filter((it) => it.id !== item.id) } : s))
    )
    try {
      await api.del(`/sector-items/${item.id}`)
    } catch (err) {
      setError(err.message)
      loadAll()
    }
  }

  const addItem = async (sector, e) => {
    e.preventDefault()
    const title = (addText[sector.id] || '').trim()
    if (!title) return
    setAddText((t) => ({ ...t, [sector.id]: '' }))
    try {
      const created = await api.post(`/sectors/${sector.id}/items`, { title })
      replaceItem(created)
    } catch (err) {
      setError(err.message)
    }
  }

  // ----- Boîte d'entrée -----

  const addInbox = async (e) => {
    e.preventDefault()
    const title = inboxText.trim()
    if (!title) return
    setInboxText('')
    try {
      const created = await api.post('/inbox', { title })
      setInbox((prev) => [...prev, created])
    } catch (err) {
      setError(err.message)
    }
  }

  const moveInbox = async (entry, sectorId) => {
    if (!sectorId) return
    try {
      const created = await api.post(`/inbox/${entry.id}/move`, { sector_id: Number(sectorId) })
      setInbox((prev) => prev.filter((x) => x.id !== entry.id))
      replaceItem(created)
    } catch (err) {
      setError(err.message)
    }
  }

  const removeInbox = async (entry) => {
    setInbox((prev) => prev.filter((x) => x.id !== entry.id))
    try {
      await api.del(`/inbox/${entry.id}`)
    } catch (err) {
      setError(err.message)
      loadAll()
    }
  }

  // ----- Secteurs -----

  const openNewSector = () => {
    setEditingSectorId(null)
    setSectorForm({ ...emptySectorForm, color: PALETTE[sectors.length % PALETTE.length] })
    setShowSectorForm(true)
  }

  const openEditSector = (sector) => {
    setEditingSectorId(sector.id)
    setSectorForm({ name: sector.name, description: sector.description || '', color: sector.color })
    setShowSectorForm(true)
  }

  function closeSectorForm() {
    setShowSectorForm(false)
    setEditingSectorId(null)
    setSectorForm(emptySectorForm)
  }

  const cycleColor = () => {
    const idx = PALETTE.indexOf(sectorForm.color)
    setSectorForm({ ...sectorForm, color: PALETTE[(idx + 1) % PALETTE.length] })
  }

  const submitSector = async (e) => {
    e.preventDefault()
    if (!sectorForm.name.trim()) return
    setError('')
    const payload = {
      name: sectorForm.name.trim(),
      description: sectorForm.description.trim() || null,
      color: sectorForm.color,
    }
    try {
      if (editingSectorId) await api.put(`/sectors/${editingSectorId}`, payload)
      else await api.post('/sectors', payload)
      closeSectorForm()
      loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  const removeSector = async (id) => {
    if (!confirm('Supprimer ce secteur et tout son contenu ?')) return
    try {
      await api.del(`/sectors/${id}`)
      closeSectorForm()
      loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  const importStarter = async () => {
    setImporting(true)
    setError('')
    try {
      await api.post('/sectors/bulk', starter)
      await loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  const renderItem = (item) => {
    if (item.kind === 'project') {
      return (
        <li className="sec-row" key={item.id}>
          <span className="sec-row-text">
            {item.title}
            <span className="sec-tag">{item.active ? 'Actif' : 'En pause'}</span>
          </span>
          <button
            type="button"
            className={`sec-pill${item.active ? ' on' : ''}`}
            onClick={() => patchItem(item, { active: !item.active })}
          >
            {item.active ? 'Actif' : 'Activer'}
          </button>
          <button type="button" className="sec-icon-btn" aria-label={`Supprimer ${item.title}`} onClick={() => removeItem(item)}>×</button>
        </li>
      )
    }
    return (
      <li className={`sec-row${item.done ? ' done' : ''}`} key={item.id}>
        <input
          type="checkbox"
          id={`item-${item.id}`}
          checked={item.done}
          onChange={(e) => patchItem(item, { done: e.target.checked })}
        />
        <label className="sec-row-text" htmlFor={`item-${item.id}`}>{item.title}</label>
        <button
          type="button"
          className={`sec-icon-btn${item.focus ? ' on' : ''}`}
          aria-pressed={item.focus}
          aria-label={item.focus ? 'Retirer des priorités' : 'Marquer comme priorité'}
          title="Priorité de la semaine"
          onClick={() => patchItem(item, { focus: !item.focus })}
        >
          {item.focus ? '★' : '☆'}
        </button>
        <button type="button" className="sec-icon-btn" aria-label={`Supprimer ${item.title}`} onClick={() => removeItem(item)}>×</button>
      </li>
    )
  }

  const renderSector = (sector) => {
    const tasks = sector.items.filter((it) => it.kind !== 'project')
    const done = tasks.filter((it) => it.done).length
    const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0
    const activeProjects = sector.items.filter((it) => it.kind === 'project' && it.active).length
    const focusCount = sector.items.filter((it) => it.focus).length
    return (
      <section className="sec-card" key={sector.id}>
        <header className="sec-card-header">
          <h3>
            <span className="sec-dot" style={{ background: sector.color }} />
            {sector.name}
          </h3>
          <div className="sec-card-meta">
            {tasks.length > 0 && <span className="sec-count">{done} / {tasks.length}</span>}
            <button type="button" className="secondary sec-edit-btn" onClick={() => openEditSector(sector)}>Modifier</button>
          </div>
        </header>
        {sector.description && <p className="sec-desc">{sector.description}</p>}
        {tasks.length > 0 && (
          <div className="sec-bar" role="img" aria-label={`${pct} % fait`}>
            <i style={{ width: `${pct}%`, background: sector.color }} />
          </div>
        )}
        {activeProjects > MAX_ACTIVE_PROJECTS && (
          <p className="sec-warn">{activeProjects} projets actifs : au-delà de {MAX_ACTIVE_PROJECTS}, la tête se disperse.</p>
        )}
        {focusCount > 0 && <p className="sec-hint">{focusCount} / {MAX_FOCUS} priorités choisies</p>}
        <div className="sec-card-body">
          {sector.items.length === 0 ? <p className="sec-empty">Rien ici pour l'instant.</p> : <ul>{sector.items.map(renderItem)}</ul>}
        </div>
        <form className="sec-add" onSubmit={(e) => addItem(sector, e)}>
          <input
            type="text"
            placeholder={`Ajouter dans ${sector.name}`}
            aria-label={`Ajouter dans ${sector.name}`}
            value={addText[sector.id] || ''}
            onChange={(e) => setAddText((t) => ({ ...t, [sector.id]: e.target.value }))}
          />
          <button type="submit">Ajouter</button>
        </form>
      </section>
    )
  }

  return (
    <section>
      <PageHeader
        kicker={`${sectors.length} secteurs · Ma vie`}
        title="Ma vie par secteur."
        description="Une seule boîte d'entrée, une revue le dimanche (30 min), trois priorités par secteur. Le reste n'a pas besoin de ta tête."
        statNumber={`${taskStats.done}/${taskStats.total}`}
        statLabel="tâches faites"
      />

      <hr className="page-rule" />

      <div className="agenda-toolbar">
        <span className="sec-notice" role="status">{notice}</span>
        <button type="button" onClick={openNewSector}>+ Secteur</button>
      </div>

      {error && <p className="error">{error}</p>}

      {loaded && sectors.length === 0 && (
        <div className="week-empty">
          <p>Tu n'as pas encore de secteurs. Je peux charger les 8 secteurs de ta vie, avec leur contenu de départ :</p>
          <ul>
            {starter.sectors.map((s) => (
              <li key={s.name}>{s.name}</li>
            ))}
          </ul>
          <div className="modal-actions">
            <button type="button" onClick={importStarter} disabled={importing}>
              {importing ? 'Chargement…' : 'Charger mes secteurs'}
            </button>
            <button type="button" className="secondary" onClick={openNewSector}>Créer un secteur</button>
          </div>
        </div>
      )}

      {sectors.length > 0 && (
        <>
          <div className="sec-summary">
            <section className="sec-panel">
              <header className="sec-panel-header">
                <h2>Cette semaine</h2>
                <span className="sec-count">{focusList.filter((x) => x.item.done).length} / {focusList.length}</span>
              </header>
              <p className="sec-hint">Trois priorités au maximum par secteur. Marque une tâche avec l'étoile ☆ pour la faire remonter ici.</p>
              {focusList.length === 0 ? (
                <p className="sec-empty">Aucune priorité choisie pour l'instant.</p>
              ) : (
                <ul>
                  {focusList.map(({ item, sector }) => (
                    <li className={`sec-row${item.done ? ' done' : ''}`} key={item.id}>
                      <input
                        type="checkbox"
                        id={`focus-${item.id}`}
                        checked={item.done}
                        onChange={(e) => patchItem(item, { done: e.target.checked })}
                      />
                      <label className="sec-row-text" htmlFor={`focus-${item.id}`}>
                        {item.title}
                        <span className="sec-tag">{sector.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="sec-panel">
              <header className="sec-panel-header">
                <h2>Boîte d'entrée</h2>
                <span className="sec-count">{inbox.length}</span>
              </header>
              <p className="sec-hint">Tout ce qui te passe par la tête arrive ici, sans tri. Tu le ranges au moment de la revue du dimanche.</p>
              <form className="sec-add" onSubmit={addInbox}>
                <input
                  type="text"
                  placeholder="Une idée, une tâche, un souci…"
                  aria-label="Ajouter dans la boîte d'entrée"
                  value={inboxText}
                  onChange={(e) => setInboxText(e.target.value)}
                />
                <button type="submit">Ajouter</button>
              </form>
              {inbox.length === 0 ? (
                <p className="sec-empty">La boîte est vide.</p>
              ) : (
                <ul>
                  {inbox.map((entry) => (
                    <li className="sec-row" key={entry.id}>
                      <span className="sec-row-text">{entry.title}</span>
                      <select
                        aria-label="Ranger dans un secteur"
                        value=""
                        onChange={(e) => moveInbox(entry, e.target.value)}
                      >
                        <option value="">Ranger dans…</option>
                        {sectors.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <button type="button" className="sec-icon-btn" aria-label={`Supprimer ${entry.title}`} onClick={() => removeInbox(entry)}>×</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="sec-grid">{sectors.map(renderSector)}</div>
        </>
      )}

      {showSectorForm && (
        <div className="modal-backdrop" onClick={closeSectorForm}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" type="button" onClick={closeSectorForm} aria-label="Fermer">✕</button>
            <div className="modal-title">{editingSectorId ? 'Modifier le secteur' : 'Nouveau secteur'}</div>
            <form onSubmit={submitSector}>
              <div className="modal-fields-inline">
                <div>
                  <span className="field-label">Nom</span>
                  <input
                    className="field-input"
                    placeholder="ex : Santé et sport"
                    value={sectorForm.name}
                    onChange={(e) => setSectorForm({ ...sectorForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <span className="field-label">Couleur</span>
                  <button
                    type="button"
                    className="cal168-color-swatch-btn"
                    style={{ background: sectorForm.color }}
                    onClick={cycleColor}
                    aria-label="Changer la couleur"
                  />
                </div>
              </div>
              <div className="field-block">
                <span className="field-label">À quoi sert ce secteur (facultatif)</span>
                <textarea
                  className="field-textarea"
                  rows={3}
                  placeholder="Ce qui en fait partie, ce qui compte pour toi dans ce domaine…"
                  value={sectorForm.description}
                  onChange={(e) => setSectorForm({ ...sectorForm, description: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="submit">Enregistrer</button>
                <button type="button" className="secondary" onClick={closeSectorForm}>Annuler</button>
                {editingSectorId && (
                  <button type="button" className="danger" onClick={() => removeSector(editingSectorId)}>Supprimer</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
