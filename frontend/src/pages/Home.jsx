import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

const WEEKDAY_MOOD_ORDER = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

function parseDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatHM(minutes) {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

function formatMinuteClock(totalMinutes) {
  const h = Math.floor(totalMinutes / 60) % 24
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatAmount(n) {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}k`
  return String(Math.round(n))
}

function daysAgo(isoDatetime) {
  const then = new Date(isoDatetime)
  const diffMs = Date.now() - then.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'il y a 1 jour'
  return `il y a ${days} jours`
}

const goalProgress = (keyResults) => {
  if (!keyResults || keyResults.length === 0) return 0
  const done = keyResults.filter((kr) => kr.done).length
  return Math.round((done / keyResults.length) * 100)
}

export default function Home() {
  const [now, setNow] = useState(new Date())
  const [activities, setActivities] = useState([])
  const [cells, setCells] = useState([])
  const [blueprintItems, setBlueprintItems] = useState([])
  const [journalEntries, setJournalEntries] = useState([])
  const [vocabEntries, setVocabEntries] = useState([])
  const [goals, setGoals] = useState([])
  const [transactions, setTransactions] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    Promise.all([
      api.get('/calendar/activities').then(setActivities),
      api.get('/calendar/cells').then(setCells),
      api.get('/blueprint/items').then(setBlueprintItems),
      api.get('/journal').then(setJournalEntries),
      api.get('/vocabulary').then(setVocabEntries),
      api.get('/goals').then(setGoals),
      api.get('/finances/transactions').then(setTransactions),
    ]).catch((e) => setError(e.message))
  }, [])

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

  const plannedHours = cells.length
  const unassignedHours = 168 - plannedHours

  const sleepActivity = activities.find((a) => a.name.toLowerCase().includes('sommeil'))
  const sleepHours = sleepActivity ? hoursByActivity[sleepActivity.id] || 0 : 0
  const sleepAvgMinutes = (sleepHours / 7) * 60
  const sleepGoalMinutes = 7.5 * 60

  const readingActivity = activities.find((a) => a.name.toLowerCase().includes('lecture'))
  const readingHours = readingActivity ? hoursByActivity[readingActivity.id] || 0 : 0
  const readingGoalHours = 7

  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthTx = transactions.filter((t) => t.date.startsWith(monthKey))
  const savedThisMonth = monthTx.filter((t) => t.type === 'epargne').reduce((s, t) => s + t.amount, 0)
  const incomeThisMonth = monthTx.filter((t) => t.type === 'revenu').reduce((s, t) => s + t.amount, 0)
  const savingsPercent = incomeThisMonth > 0 ? Math.round((savedThisMonth / incomeThisMonth) * 100) : 0

  const topActivities = useMemo(() => {
    const rows = Object.entries(hoursByActivity)
      .map(([id, hours]) => ({ activity: activityById.get(Number(id)), hours }))
      .filter((r) => r.activity)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5)
    const max = rows.length > 0 ? rows[0].hours : 1
    return rows.map((r) => ({ ...r, pct: Math.round((r.hours / max) * 100) }))
  }, [hoursByActivity, activityById])

  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const isWeekend = now.getDay() === 0 || now.getDay() === 6
  const todaysType = isWeekend ? 'weekend' : 'travail'
  const todaysItems = useMemo(
    () => blueprintItems.filter((i) => i.day_type === todaysType).sort((a, b) => a.start_minute - b.start_minute),
    [blueprintItems, todaysType]
  )
  const currentBlock = todaysItems.find((i) => i.start_minute <= nowMinutes && nowMinutes < i.end_minute)
  const nextBlock = todaysItems.find((i) => i.start_minute > nowMinutes)

  const lastJournal = journalEntries[0]
  const recentMoods = useMemo(() => {
    const byDate = new Map(journalEntries.map((e) => [e.entry_date, e.mood]))
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().slice(0, 10)
      days.push(byDate.get(iso) || null)
    }
    return days
  }, [journalEntries])

  const wordOfTheDay = vocabEntries[0]

  const kickerDate = `${String(now.getDate()).padStart(2, '0')} ${MONTHS[now.getMonth()].toUpperCase()} ${now.getFullYear()}`

  return (
    <section>
      <div className="page-header">
        <div className="page-header-main">
          <div className="kicker">{kickerDate} · DAKAR</div>
          <h1 className="page-title">As-salaamu alaykum, Mohamed.</h1>
          <p className="page-description">
            Voici ta semaine en un coup d'œil. La constance bat l'intensité — un pas de plus aujourd'hui.
          </p>
        </div>
        <div className="page-stat">
          <div className="page-stat-number serif-italic">
            {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
          </div>
          <div className="page-stat-label">سكينة · sérénité</div>
        </div>
      </div>

      <hr className="page-rule" />

      {error && <p className="error">{error}</p>}

      <div className="home-stats-grid">
        <div className="home-stat-card">
          <div className="home-stat-label">Heures planifiées</div>
          <div className="home-stat-value serif-italic">
            {plannedHours}<span className="home-stat-suffix">/168</span>
          </div>
          <div className="home-stat-sub">{unassignedHours}h non assignées</div>
          <div className="home-stat-bar">
            <div className="home-stat-fill" style={{ width: `${Math.min(100, (plannedHours / 168) * 100)}%`, background: 'var(--accent)' }} />
          </div>
        </div>

        <div className="home-stat-card">
          <div className="home-stat-label">Sommeil moyen</div>
          <div className="home-stat-value serif-italic">{formatHM(sleepAvgMinutes)}</div>
          <div className="home-stat-sub">Objectif : {formatHM(sleepGoalMinutes)}</div>
          <div className="home-stat-bar">
            <div className="home-stat-fill" style={{ width: `${Math.min(100, (sleepAvgMinutes / sleepGoalMinutes) * 100)}%`, background: '#ab9bc9' }} />
          </div>
        </div>

        <div className="home-stat-card">
          <div className="home-stat-label">Lecture cette semaine</div>
          <div className="home-stat-value serif-italic">{readingHours}h</div>
          <div className="home-stat-sub">Objectif : {readingGoalHours}h / semaine</div>
          <div className="home-stat-bar">
            <div className="home-stat-fill" style={{ width: `${Math.min(100, (readingHours / readingGoalHours) * 100)}%`, background: '#8bbdb8' }} />
          </div>
        </div>

        <div className="home-stat-card">
          <div className="home-stat-label">Épargne du mois</div>
          <div className="home-stat-value serif-italic">
            {formatAmount(savedThisMonth)}<span className="home-stat-suffix">FCFA</span>
          </div>
          <div className="home-stat-sub">{savingsPercent}% du revenu</div>
          <div className="home-stat-bar">
            <div className="home-stat-fill" style={{ width: `${Math.min(100, savingsPercent)}%`, background: '#7c9a5c' }} />
          </div>
        </div>
      </div>

      <div className="home-grid">
        <div className="home-panel">
          <div className="home-panel-header">
            <span className="kicker">Prochain bloc · Maintenant</span>
            <Link className="home-panel-btn" to="/blueprint">Voir blueprint</Link>
          </div>
          {currentBlock ? (
            <>
              <div className="home-block">
                <div className="home-block-bar" />
                <div className="home-block-body">
                  <div className="home-block-time">
                    {formatMinuteClock(currentBlock.start_minute)} → {formatMinuteClock(currentBlock.end_minute)} ·{' '}
                    {formatHM(currentBlock.end_minute - currentBlock.start_minute)}
                  </div>
                  <div className="home-block-title serif-italic">{currentBlock.title}</div>
                  {currentBlock.subtitle && <div className="home-block-subtitle">{currentBlock.subtitle}</div>}
                </div>
              </div>
              {nextBlock && (
                <div className="home-next-row">
                  <span className="home-next-badge">SUIVANT</span>
                  <span>
                    {formatMinuteClock(nextBlock.start_minute)} — {nextBlock.title} ·{' '}
                    {formatHM(nextBlock.end_minute - nextBlock.start_minute)}
                  </span>
                </div>
              )}
            </>
          ) : (
            <p className="home-empty">Aucun bloc défini pour ce moment.</p>
          )}
        </div>

        <div className="home-panel">
          <div className="home-panel-header">
            <span className="kicker">Top 5 activités · Cette semaine</span>
            <Link className="home-panel-btn" to="/calendrier">Voir 168h</Link>
          </div>
          <ul className="home-activity-list">
            {topActivities.map(({ activity, hours, pct }) => (
              <li key={activity.id}>
                <span className="home-activity-dot" style={{ background: activity.color }} />
                <span className="home-activity-icon">{activity.icon}</span>
                <span className="home-activity-name">{activity.name}</span>
                <span className="home-activity-hours">{hours} h</span>
                <span className="home-activity-bar">
                  <span className="home-activity-fill" style={{ width: `${pct}%`, background: activity.color }} />
                </span>
              </li>
            ))}
            {topActivities.length === 0 && <li className="home-empty">Aucune activité peinte cette semaine.</li>}
          </ul>
        </div>

        <div className="home-panel">
          <div className="home-panel-header">
            <span className="kicker">
              Dernier journal{lastJournal ? ` · ${String(parseDate(lastJournal.entry_date).getDate()).padStart(2, '0')} ${MONTHS[parseDate(lastJournal.entry_date).getMonth()].slice(0, 3)}` : ''}
            </span>
            <Link className="home-panel-btn" to="/journal">Continuer</Link>
          </div>
          {lastJournal ? (
            <>
              <p className="home-journal-quote">« {lastJournal.content} »</p>
              <div className="home-mood-row">
                {recentMoods.map((mood, i) => (
                  <span
                    key={i}
                    className="home-mood-dot"
                    style={{ background: mood ? `var(--mood-${mood})` : 'var(--border-soft)' }}
                  />
                ))}
              </div>
              <div className="home-mood-caption">HUMEUR · 7 DERNIERS JOURS</div>
            </>
          ) : (
            <p className="home-empty">Aucune entrée de journal pour l'instant.</p>
          )}
        </div>

        <div className="home-panel">
          <div className="home-panel-header">
            <span className="kicker">Mot du jour</span>
            <Link className="home-panel-btn" to="/vocabulaire">Tous les mots</Link>
          </div>
          {wordOfTheDay ? (
            <>
              <div className="home-word-row">
                <span className="home-word serif-italic">{wordOfTheDay.term}</span>
                <span className="home-word-badge">{wordOfTheDay.language}</span>
              </div>
              <div className="home-word-meta">
                {wordOfTheDay.nature ? `${wordOfTheDay.nature} · ` : ''}ajouté {daysAgo(wordOfTheDay.created_at)}
              </div>
              <p className="home-word-definition">{wordOfTheDay.definition}</p>
              <div className="home-word-actions">
                <Link className="home-word-btn-primary" to="/vocabulaire">Réviser maintenant</Link>
                <Link className="home-word-btn-secondary" to="/vocabulaire">Ajouter un mot</Link>
              </div>
            </>
          ) : (
            <p className="home-empty">Aucun mot enregistré pour l'instant.</p>
          )}
        </div>
      </div>

      <div className="home-panel home-goals-panel">
        <div className="home-panel-header">
          <span className="kicker">Objectifs 2026 · Vue rapide</span>
          <Link className="home-panel-btn" to="/objectifs">Tous les objectifs</Link>
        </div>
        <div className="home-goals-row">
          {goals.map((goal) => (
            <div className="home-goal-chip" key={goal.id}>
              <span className="home-goal-dot" style={{ background: goal.color }} />
              <span className="home-goal-domain">{goal.domain}</span>
              <span className="home-goal-percent">{goalProgress(goal.key_results)}%</span>
            </div>
          ))}
          {goals.length === 0 && <p className="home-empty">Aucun objectif pour l'instant.</p>}
        </div>
      </div>
    </section>
  )
}
