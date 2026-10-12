import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { KIND_BY_VALUE, rulesForDate, timeText, toISO } from '../lib/discipline'

// « Aujourd'hui, je m'engage à… » : les règles du jour, à cocher le soir.
export default function TodayCommitments() {
  const todayISO = toISO(new Date())
  const [rules, setRules] = useState([])
  const [overrides, setOverrides] = useState([])
  const [checks, setChecks] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/discipline/rules').then(setRules),
      api.get(`/discipline/overrides?start=${todayISO}&end=${todayISO}`).then(setOverrides),
      api.get(`/discipline/checks?start=${todayISO}&end=${todayISO}`).then(setChecks),
    ])
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true))
  }, [todayISO])

  const todayRules = useMemo(() => rulesForDate(rules, todayISO, overrides), [rules, overrides, todayISO])
  const checkedSet = useMemo(() => new Set(checks.map((c) => c.rule_id)), [checks])
  const doneCount = todayRules.filter((r) => checkedSet.has(r.id)).length

  const toggle = async (rule) => {
    setError('')
    const wasDone = checkedSet.has(rule.id)
    setChecks((prev) =>
      wasDone ? prev.filter((c) => c.rule_id !== rule.id) : [...prev, { rule_id: rule.id, date: todayISO }]
    )
    try {
      await api.put('/discipline/checks', { rule_id: rule.id, date: todayISO, done: !wasDone })
    } catch (err) {
      setError(err.message)
      api.get(`/discipline/checks?start=${todayISO}&end=${todayISO}`).then(setChecks).catch(() => {})
    }
  }

  if (!loaded) return null

  return (
    <div className="home-panel commitments-panel">
      <div className="home-panel-header">
        <span className="kicker">Aujourd'hui, je m'engage à</span>
        <Link className="home-panel-btn" to="/semaine">Ma semaine</Link>
      </div>

      {error && <p className="error">{error}</p>}

      {rules.length === 0 ? (
        <p className="home-empty">
          Aucune règle pour l'instant. <Link to="/semaine">Prépare ta semaine</Link> pour décider à l'avance.
        </p>
      ) : todayRules.length === 0 ? (
        <p className="home-empty">Aucune règle prévue aujourd'hui.</p>
      ) : (
        <>
          <div className="commitments-progress">
            {doneCount} / {todayRules.length} tenus
          </div>
          <div className="commitments-list">
            {todayRules.map((rule) => {
              const kind = KIND_BY_VALUE[rule.kind]
              const checked = checkedSet.has(rule.id)
              return (
                <label className={`commitment${checked ? ' done' : ''}`} key={rule.id}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(rule)} />
                  <span className="commitment-main">
                    <span className="commitment-title">
                      {rule.icon && <span>{rule.icon} </span>}
                      {rule.title}
                    </span>
                    <span className="commitment-meta">
                      <span style={{ color: kind.color }}>{kind.label}</span>
                      {timeText(rule) && <span> · {timeText(rule)}</span>}
                    </span>
                    {rule.note && <span className="commitment-note">{rule.note}</span>}
                  </span>
                </label>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
