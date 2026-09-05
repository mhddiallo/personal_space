import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

const COLOR_RULES = [
  { test: /tahajjud|fajr|coran|isha|zikr|du'a/i, color: 'var(--mood-ambre)' },
  { test: /sport|course|musculation|marche|v[ée]lo/i, color: 'var(--mood-vert)' },
  { test: /trajet|d[ée]jeuner \+ trajet/i, color: '#5c7f9c' },
  { test: /travail/i, color: 'var(--danger)' },
  { test: /dhuhr|d[ée]jeuner|courses|t[âa]ches maison|d[îi]ner/i, color: 'var(--mood-rose)' },
  { test: /famille/i, color: 'var(--mood-violet)' },
  { test: /lecture/i, color: 'var(--mood-bleu)' },
  { test: /sommeil|d[ée]tente/i, color: '#9c8ba0' },
]

function colorFor(title) {
  const rule = COLOR_RULES.find((r) => r.test.test(title))
  return rule ? rule.color : 'var(--accent)'
}

function formatMinute(m) {
  const h = Math.floor(m / 60) % 24
  const mm = m % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export default function Blueprint() {
  const [items, setItems] = useState([])
  const [dayType, setDayType] = useState('travail')
  const [error, setError] = useState('')

  const load = () =>
    api
      .get(`/blueprint/items?day_type=${dayType}`)
      .then(setItems)
      .catch((e) => setError(e.message))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayType])

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.start_minute - b.start_minute),
    [items]
  )

  return (
    <section>
      <div className="bp-toolbar">
        <div className="bp-toggle-group">
          <button
            type="button"
            className={`bp-toggle${dayType === 'travail' ? ' active' : ''}`}
            onClick={() => setDayType('travail')}
          >
            Jour de travail
          </button>
          <button
            type="button"
            className={`bp-toggle${dayType === 'weekend' ? ' active' : ''}`}
            onClick={() => setDayType('weekend')}
          >
            Week-end
          </button>
        </div>
        <div className="bp-actions">
          <button type="button" className="bp-btn-outline">Comparer à hier</button>
          <button type="button" className="bp-btn-filled">Marquer comme suivie</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="bp-timeline">
        {sortedItems.map((item) => (
          <div className="bp-row" key={item.id} style={{ '--bp-row-color': colorFor(item.title) }}>
            <div className="bp-time-start">{formatMinute(item.start_minute)}</div>
            <div className="bp-row-bar" />
            <div className="bp-row-main">
              <div className="bp-row-title">
                {item.icon && <span className="bp-row-icon">{item.icon}</span>}
                {item.title}
              </div>
              {item.subtitle && <div className="bp-row-subtitle">{item.subtitle}</div>}
            </div>
            <div className="bp-row-range">
              {formatMinute(item.start_minute)} → {formatMinute(item.end_minute)}
            </div>
          </div>
        ))}
        {sortedItems.length === 0 && (
          <p className="home-empty">Aucun créneau pour ce type de journée.</p>
        )}
      </div>
    </section>
  )
}
