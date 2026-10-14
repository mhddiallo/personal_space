import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'
import {
  KINDS,
  KIND_BY_VALUE,
  STARTER_RULES,
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
  addDays,
  fromISO,
  isRuleActive,
  mondayOf,
  rulesForDate,
  timeText,
  toISO,
  weekdayOf,
} from '../lib/discipline'

const emptyRuleForm = {
  title: '',
  kind: 'a_faire',
  icon: '',
  start_time: '',
  end_time: '',
  time_label: '',
  note: '',
  weekdays: [],
}

function weekLabel(startISO) {
  const start = fromISO(startISO)
  const end = fromISO(addDays(startISO, 6))
  const sameMonth = start.getMonth() === end.getMonth()
  const startText = start.toLocaleDateString('fr-FR', sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'long' })
  const endText = end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${startText} – ${endText}`
}

export default function Semaine() {
  const todayISO = toISO(new Date())
  const [rules, setRules] = useState([])
  const [overrides, setOverrides] = useState([])
  const [checks, setChecks] = useState([])
  const [error, setError] = useState('')
  const [view, setView] = useState('semaine')
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayISO))
  const [editingDay, setEditingDay] = useState(null)
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState(null)
  const [ruleForm, setRuleForm] = useState(emptyRuleForm)
  const [loadingStarter, setLoadingStarter] = useState(false)

  const weekEnd = addDays(weekStart, 6)

  const loadRules = () => api.get('/discipline/rules').then(setRules).catch((e) => setError(e.message))
  const loadWeek = () =>
    Promise.all([
      api.get(`/discipline/overrides?start=${weekStart}&end=${weekEnd}`).then(setOverrides),
      api.get(`/discipline/checks?start=${weekStart}&end=${weekEnd}`).then(setChecks),
    ]).catch((e) => setError(e.message))

  useEffect(() => {
    loadRules()
  }, [])

  // Le pop-up de règle se ferme avec Échap.
  useEffect(() => {
    if (!showRuleForm) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setShowRuleForm(false)
        setEditingRuleId(null)
        setRuleForm(emptyRuleForm)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showRuleForm])

  useEffect(() => {
    setEditingDay(null)
    loadWeek()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart])

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const checkedSet = useMemo(() => new Set(checks.map((c) => `${c.rule_id}|${c.date}`)), [checks])

  // Score de la semaine jusqu'à aujourd'hui.
  const score = useMemo(() => {
    let due = 0
    let done = 0
    for (const day of days) {
      if (day > todayISO) continue
      for (const rule of rulesForDate(rules, day, overrides)) {
        due += 1
        if (checkedSet.has(`${rule.id}|${day}`)) done += 1
      }
    }
    return { due, done, percent: due ? Math.round((done / due) * 100) : null }
  }, [days, rules, overrides, checkedSet, todayISO])

  const toggleCheck = async (rule, day) => {
    if (day > todayISO) return
    setError('')
    const key = `${rule.id}|${day}`
    const wasDone = checkedSet.has(key)
    setChecks((prev) =>
      wasDone
        ? prev.filter((c) => !(c.rule_id === rule.id && c.date === day))
        : [...prev, { rule_id: rule.id, date: day }]
    )
    try {
      await api.put('/discipline/checks', { rule_id: rule.id, date: day, done: !wasDone })
    } catch (err) {
      setError(err.message)
      loadWeek()
    }
  }

  // Inclure / retirer une règle pour une date précise (exception à la semaine type).
  const setRuleForDay = async (rule, day, wanted) => {
    setError('')
    const inTemplate = rule.weekdays.includes(weekdayOf(day))
    try {
      if (wanted === inTemplate) {
        await api.del(`/discipline/overrides?date=${day}&rule_id=${rule.id}`)
      } else {
        await api.put('/discipline/overrides', { rule_id: rule.id, date: day, action: wanted ? 'add' : 'remove' })
      }
      await loadWeek()
    } catch (err) {
      setError(err.message)
    }
  }

  const resetDay = async (day) => {
    setError('')
    try {
      await api.del(`/discipline/overrides?date=${day}`)
      await loadWeek()
    } catch (err) {
      setError(err.message)
    }
  }

  // ----- Règles -----

  const openNewRule = () => {
    setEditingRuleId(null)
    setRuleForm(emptyRuleForm)
    setShowRuleForm(true)
  }

  const openEditRule = (rule) => {
    setEditingRuleId(rule.id)
    setRuleForm({
      title: rule.title,
      kind: rule.kind,
      icon: rule.icon || '',
      start_time: rule.start_time || '',
      end_time: rule.end_time || '',
      time_label: rule.time_label || '',
      note: rule.note || '',
      weekdays: rule.weekdays,
    })
    setShowRuleForm(true)
  }

  const closeRuleForm = () => {
    setShowRuleForm(false)
    setEditingRuleId(null)
    setRuleForm(emptyRuleForm)
  }

  const toggleFormWeekday = (w) => {
    setRuleForm((f) => ({
      ...f,
      weekdays: f.weekdays.includes(w) ? f.weekdays.filter((x) => x !== w) : [...f.weekdays, w].sort(),
    }))
  }

  const submitRule = async (e) => {
    e.preventDefault()
    if (!ruleForm.title.trim()) return
    setError('')
    const payload = {
      title: ruleForm.title.trim(),
      kind: ruleForm.kind,
      icon: ruleForm.icon.trim() || null,
      start_time: ruleForm.start_time || null,
      end_time: ruleForm.end_time || null,
      time_label: ruleForm.time_label.trim() || null,
      note: ruleForm.note.trim() || null,
      weekdays: ruleForm.weekdays,
    }
    try {
      if (editingRuleId) await api.put(`/discipline/rules/${editingRuleId}`, payload)
      else await api.post('/discipline/rules', payload)
      closeRuleForm()
      await loadRules()
      loadWeek()
    } catch (err) {
      setError(err.message)
    }
  }

  const removeRule = async (id) => {
    if (!confirm('Supprimer cette règle ? Son historique de cases cochées sera aussi supprimé.')) return
    try {
      await api.del(`/discipline/rules/${id}`)
      if (editingRuleId === id) closeRuleForm()
      await loadRules()
      loadWeek()
    } catch (err) {
      setError(err.message)
    }
  }

  const loadStarter = async () => {
    setLoadingStarter(true)
    setError('')
    try {
      for (const rule of STARTER_RULES) await api.post('/discipline/rules', rule)
      await loadRules()
      loadWeek()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingStarter(false)
    }
  }

  const renderRuleRow = (rule, day) => {
    const kind = KIND_BY_VALUE[rule.kind]
    const checked = checkedSet.has(`${rule.id}|${day}`)
    const future = day > todayISO
    const missed = !checked && day < todayISO
    return (
      <div className={`week-rule${checked ? ' done' : ''}${missed ? ' missed' : ''}`} key={rule.id}>
        <label className="week-rule-check">
          <input
            type="checkbox"
            checked={checked}
            disabled={future}
            onChange={() => toggleCheck(rule, day)}
            aria-label={`${rule.title} — ${checked ? 'tenu' : 'non tenu'}`}
          />
        </label>
        <div className="week-rule-body">
          <div className="week-rule-title">
            {rule.icon && <span>{rule.icon}</span>}
            <span>{rule.title}</span>
          </div>
          <div className="week-rule-meta">
            <span className="week-rule-kind" style={{ color: kind.color }}>{kind.label}</span>
            {timeText(rule) && <span>{timeText(rule)}</span>}
          </div>
          {rule.note && <div className="week-rule-note">{rule.note}</div>}
        </div>
      </div>
    )
  }

  return (
    <section>
      <PageHeader
        kicker={`${rules.length} règles · Discipline`}
        title="Ma semaine."
        description="Décide à l'avance, coche le soir. Ce qui est écrit d'avance se négocie beaucoup moins sur le moment."
        statNumber={score.percent === null ? '—' : `${score.percent}%`}
        statLabel={score.due ? `tenu · ${score.done}/${score.due}` : 'tenu cette semaine'}
      />

      <hr className="page-rule" />

      <div className="agenda-toolbar">
        <div className="repertoire-toggle-group">
          <button type="button" className={view === 'semaine' ? 'active' : ''} onClick={() => setView('semaine')}>
            Semaine
          </button>
          <button type="button" className={view === 'regles' ? 'active' : ''} onClick={() => setView('regles')}>
            Règles
          </button>
        </div>
        {view === 'regles' && <button type="button" onClick={openNewRule}>+ Règle</button>}
      </div>

      {error && <p className="error">{error}</p>}

      {showRuleForm && (
        <div className="modal-backdrop" onClick={closeRuleForm}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" type="button" onClick={closeRuleForm} aria-label="Fermer">✕</button>
          <div className="modal-title">{editingRuleId ? 'Modifier la règle' : 'Nouvelle règle'}</div>
          <form onSubmit={submitRule}>
            <div className="modal-fields-inline">
              <div>
                <span className="field-label">Règle</span>
                <input
                  className="field-input"
                  placeholder="ex : Pas de films ni de séries"
                  value={ruleForm.title}
                  onChange={(e) => setRuleForm({ ...ruleForm, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <span className="field-label">Icône</span>
                <input
                  className="field-input"
                  placeholder="🚫"
                  maxLength={4}
                  value={ruleForm.icon}
                  onChange={(e) => setRuleForm({ ...ruleForm, icon: e.target.value })}
                />
              </div>
            </div>

            <div className="field-block">
              <span className="field-label">Type</span>
              <div className="category-pills">
                {KINDS.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    className={ruleForm.kind === k.value ? 'active' : ''}
                    onClick={() => setRuleForm({ ...ruleForm, kind: k.value })}
                  >
                    {k.icon} {k.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="agenda-form-row">
              <div>
                <span className="field-label">Début (facultatif)</span>
                <input
                  type="time"
                  className="field-input"
                  value={ruleForm.start_time}
                  onChange={(e) => setRuleForm({ ...ruleForm, start_time: e.target.value })}
                />
              </div>
              <div>
                <span className="field-label">Fin</span>
                <input
                  type="time"
                  className="field-input"
                  value={ruleForm.end_time}
                  onChange={(e) => setRuleForm({ ...ruleForm, end_time: e.target.value })}
                />
              </div>
              <div>
                <span className="field-label">Libellé d'horaire (facultatif)</span>
                <input
                  className="field-input"
                  placeholder="ex : 12h45–13h15 · 19h30–20h"
                  value={ruleForm.time_label}
                  onChange={(e) => setRuleForm({ ...ruleForm, time_label: e.target.value })}
                />
              </div>
            </div>

            <div className="field-block">
              <span className="field-label">Jours de la semaine type</span>
              <div className="category-pills">
                {WEEKDAY_SHORT.map((label, w) => (
                  <button
                    key={label}
                    type="button"
                    className={ruleForm.weekdays.includes(w) ? 'active' : ''}
                    onClick={() => toggleFormWeekday(w)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="week-presets">
                <button type="button" className="secondary" onClick={() => setRuleForm({ ...ruleForm, weekdays: [0, 1, 2, 3, 4, 5, 6] })}>Tous les jours</button>
                <button type="button" className="secondary" onClick={() => setRuleForm({ ...ruleForm, weekdays: [0, 1, 2, 3, 4] })}>Lun–ven</button>
                <button type="button" className="secondary" onClick={() => setRuleForm({ ...ruleForm, weekdays: [5, 6] })}>Week-end</button>
              </div>
            </div>

            <div className="field-block">
              <span className="field-label">Note (étapes, précisions…)</span>
              <textarea
                className="field-textarea"
                rows={3}
                placeholder="Quand je m'assois au bureau, alors j'ouvre mon cours avant WhatsApp."
                value={ruleForm.note}
                onChange={(e) => setRuleForm({ ...ruleForm, note: e.target.value })}
              />
            </div>

            <div className="modal-actions">
              <button type="submit">Enregistrer</button>
              <button type="button" className="secondary" onClick={closeRuleForm}>Annuler</button>
              {editingRuleId && (
                <button type="button" className="danger" onClick={() => removeRule(editingRuleId)}>Supprimer</button>
              )}
            </div>
          </form>
          </div>
        </div>
      )}

      {rules.length === 0 && (
        <div className="week-empty">
          <p>Tu n'as encore aucune règle. Je te propose une base à ajuster ensuite :</p>
          <ul>
            <li>Coucher tôt les veilles de nuit de prière, coucher à 22h30 les autres soirs</li>
            <li>Téléphone hors de la chambre, messages et réseaux en deux créneaux</li>
            <li>Rituel d'arrivée au bureau, lecture le soir</li>
            <li>YouTube le samedi seulement, films et séries le vendredi et le samedi</li>
          </ul>
          <div className="modal-actions">
            <button type="button" onClick={loadStarter} disabled={loadingStarter}>
              {loadingStarter ? 'Chargement…' : 'Charger ma proposition de départ'}
            </button>
            <button type="button" className="secondary" onClick={() => { setView('regles'); openNewRule() }}>
              Créer ma première règle
            </button>
          </div>
        </div>
      )}

      {view === 'semaine' && rules.length > 0 && (
        <>
          <div className="week-nav">
            <button type="button" className="agenda-nav-btn" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Semaine précédente">‹</button>
            <div className="week-nav-label">
              <span className="serif-italic">{weekLabel(weekStart)}</span>
            </div>
            <button type="button" className="agenda-nav-btn" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Semaine suivante">›</button>
            <button type="button" className="secondary agenda-today-btn" onClick={() => setWeekStart(mondayOf(todayISO))}>
              Cette semaine
            </button>
          </div>

          <div className="semaine-grid">
            {days.map((day) => {
              const dayRules = rulesForDate(rules, day, overrides)
              const isToday = day === todayISO
              const editing = editingDay === day
              const hasOverride = overrides.some((o) => o.date === day)
              return (
                <div className={`week-day${isToday ? ' today' : ''}${day < todayISO ? ' past' : ''}`} key={day}>
                  <div className="week-day-header">
                    <div>
                      <div className="week-day-name">{WEEKDAY_LONG[weekdayOf(day)]}</div>
                      <div className="week-day-date">
                        {fromISO(day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                        {isToday && <span className="week-today-tag">Aujourd'hui</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="secondary week-edit-btn"
                      onClick={() => setEditingDay(editing ? null : day)}
                    >
                      {editing ? 'Terminé' : 'Modifier'}
                    </button>
                  </div>

                  <div className="week-day-body">
                  {!editing && dayRules.length === 0 && <p className="week-day-empty">Aucune règle ce jour-là.</p>}
                  {!editing && dayRules.map((rule) => renderRuleRow(rule, day))}

                  {editing && (
                    <div className="week-edit-list">
                      <p className="week-edit-hint">Coche les règles qui s'appliquent à ce jour précis.</p>
                      {[...rules].map((rule) => (
                        <label className="week-edit-row" key={rule.id}>
                          <input
                            type="checkbox"
                            checked={isRuleActive(rule, day, overrides)}
                            onChange={(e) => setRuleForDay(rule, day, e.target.checked)}
                          />
                          <span>{rule.icon} {rule.title}</span>
                          {timeText(rule) && <span className="week-edit-time">{timeText(rule)}</span>}
                        </label>
                      ))}
                      {hasOverride && (
                        <button type="button" className="secondary" onClick={() => resetDay(day)}>
                          Remettre la semaine type
                        </button>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {view === 'regles' && rules.length > 0 && (
        <div className="week-rules-list">
          {rules.map((rule) => {
            const kind = KIND_BY_VALUE[rule.kind]
            return (
              <div className="week-rule-card" key={rule.id} onClick={() => openEditRule(rule)}>
                <div className="week-rule-card-main">
                  <div className="week-rule-title">
                    {rule.icon && <span>{rule.icon}</span>}
                    <span>{rule.title}</span>
                  </div>
                  <div className="week-rule-meta">
                    <span className="week-rule-kind" style={{ color: kind.color }}>{kind.label}</span>
                    {timeText(rule) && <span>{timeText(rule)}</span>}
                  </div>
                  {rule.note && <div className="week-rule-note">{rule.note}</div>}
                </div>
                <div className="week-rule-days">
                  {WEEKDAY_SHORT.map((label, w) => (
                    <span key={label} className={`week-day-pill${rule.weekdays.includes(w) ? ' on' : ''}`}>
                      {label.slice(0, 1)}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
