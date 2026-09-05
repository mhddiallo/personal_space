import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'

const PALETTE = [
  '#4f6f52', '#1c1a16', '#7c9a5c', '#c17a4a', '#b5482f', '#ab9bc9',
  '#5c7f9c', '#cf9a55', '#8bbdb8', '#9c8ba0',
]

const emptyForm = {
  domain: '',
  title: '',
  color: PALETTE[0],
  key_results: [{ label: '', done: false }],
}

const computeProgress = (keyResults) => {
  if (!keyResults || keyResults.length === 0) return 0
  const done = keyResults.filter((kr) => kr.done).length
  return Math.round((done / keyResults.length) * 100)
}

export default function Goals() {
  const [goals, setGoals] = useState([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const load = () => api.get('/goals').then(setGoals).catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const toggleKeyResult = async (goal, kr) => {
    setError('')
    const updatedKeyResults = goal.key_results.map((k) => (k.id === kr.id ? { ...k, done: !k.done } : k))
    const newProgress = computeProgress(updatedKeyResults)
    // optimistic update
    setGoals((prev) =>
      prev.map((g) => (g.id !== goal.id ? g : { ...g, key_results: updatedKeyResults, progress_percent: newProgress }))
    )
    try {
      await api.put(`/goals/${goal.id}/key-results/${kr.id}`, { done: !kr.done })
      await api.put(`/goals/${goal.id}`, { progress_percent: newProgress })
    } catch (err) {
      setError(err.message)
      load()
    }
  }

  const averageProgress = useMemo(() => {
    if (goals.length === 0) return 0
    return Math.round(goals.reduce((sum, g) => sum + computeProgress(g.key_results), 0) / goals.length)
  }, [goals])

  const openNew = () => {
    setForm(emptyForm)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setForm(emptyForm)
  }

  const cycleColor = () => {
    const idx = PALETTE.indexOf(form.color)
    setForm({ ...form, color: PALETTE[(idx + 1) % PALETTE.length] })
  }

  const updateKeyResult = (idx, label) => {
    const key_results = form.key_results.map((kr, i) => (i === idx ? { ...kr, label } : kr))
    setForm({ ...form, key_results })
  }

  const addKeyResultField = () => {
    setForm({ ...form, key_results: [...form.key_results, { label: '', done: false }] })
  }

  const removeKeyResultField = (idx) => {
    setForm({ ...form, key_results: form.key_results.filter((_, i) => i !== idx) })
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const payload = {
      domain: form.domain,
      title: form.title,
      color: form.color,
      year: 2026,
      key_results: form.key_results
        .map((kr) => ({ ...kr, label: kr.label.trim() }))
        .filter((kr) => kr.label),
    }
    try {
      await api.post('/goals', payload)
      closeForm()
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const removeGoal = async (id) => {
    if (!confirm('Supprimer cet objectif ?')) return
    await api.del(`/goals/${id}`)
    load()
  }

  return (
    <section>
      <PageHeader
        kicker={`Année 2026 · ${goals.length} grands chantiers`}
        title="Mes objectifs."
        description="Six domaines, un objectif par domaine, des résultats clés mesurables. Pas de liste à rallonge — la concentration est un acte de violence amoureuse contre la dispersion."
        statNumber={`${averageProgress}%`}
        statLabel="progression moyenne"
      />

      <hr className="page-rule" />

      <div className="goals-toolbar">
        <button type="button" className="goals-add-btn" onClick={openNew}>+ Nouvel objectif</button>
      </div>

      {error && <p className="error">{error}</p>}

      {showForm && (
        <div className="vocab-panel goal-panel">
          <button className="vocab-panel-close" type="button" onClick={closeForm}>✕</button>
          <div className="vocab-panel-title">Ajouter un nouvel objectif</div>
          <form onSubmit={submit}>
            <div className="modal-fields-inline">
              <div>
                <span className="field-label">Domaine</span>
                <input
                  className="field-input"
                  placeholder="ex: Spirituel, Carrière..."
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
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

            <div className="field-block">
              <span className="field-label">Titre de l'objectif</span>
              <input
                className="field-input"
                placeholder="ex: Terminer la mémorisation du Juz 'Amma"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div className="field-block">
              <span className="field-label">Résultats clés</span>
              {form.key_results.map((kr, idx) => (
                <div className="goal-kr-input-row" key={idx}>
                  <input
                    className="field-input"
                    placeholder="ex: Mémoriser 1 sourate / semaine"
                    value={kr.label}
                    onChange={(e) => updateKeyResult(idx, e.target.value)}
                  />
                  {form.key_results.length > 1 && (
                    <button type="button" className="goal-kr-remove" onClick={() => removeKeyResultField(idx)}>×</button>
                  )}
                </div>
              ))}
              <button type="button" className="goal-kr-add" onClick={addKeyResultField}>+ Ajouter un résultat clé</button>
            </div>

            {error && <p className="error">{error}</p>}

            <div className="modal-actions">
              <button type="submit">Enregistrer l'objectif</button>
              <button type="button" className="secondary" onClick={closeForm}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      <div className="goals-grid">
        {goals.map((goal) => {
          const percent = computeProgress(goal.key_results)
          return (
            <div className="goal-card" key={goal.id}>
              <button className="goal-card-remove" type="button" onClick={() => removeGoal(goal.id)} aria-label="Supprimer">✕</button>
              <div className="goal-card-header">
                <span className="goal-domain">
                  <span className="goal-domain-dot" style={{ background: goal.color }} />
                  {goal.domain}
                </span>
                <span className="goal-percent">{percent}%</span>
              </div>
              <div className="goal-title serif-italic">{goal.title}</div>
              <ul className="goal-key-results">
                {goal.key_results.map((kr) => (
                  <li key={kr.id} className={kr.done ? 'done' : ''} onClick={() => toggleKeyResult(goal, kr)}>
                    <span className="goal-kr-check">{kr.done && '✓'}</span>
                    <span className="goal-kr-label">{kr.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {goals.length > 0 && (
        <div className="goals-summary">
          <div className="goals-summary-title">Progression sur 12 mois</div>
          {goals.map((goal) => {
            const percent = computeProgress(goal.key_results)
            return (
              <div className="goals-summary-row" key={goal.id}>
                <span className="goals-summary-label">{goal.domain}</span>
                <span className="goals-summary-bar">
                  <span
                    className="goals-summary-fill"
                    style={{ width: `${percent}%`, background: goal.color }}
                  />
                </span>
                <span className="goals-summary-percent">{percent}%</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
