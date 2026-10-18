import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

// Accueil : vider sa tête en une ligne + les priorités de la semaine, choisies dans les secteurs.
export default function PrioritiesPanel() {
  const [sectors, setSectors] = useState([])
  const [inboxCount, setInboxCount] = useState(0)
  const [text, setText] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const load = () =>
    Promise.all([
      api.get('/sectors').then(setSectors),
      api.get('/inbox').then((list) => setInboxCount(list.length)),
    ])
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true))

  useEffect(() => {
    load()
  }, [])

  const focusList = useMemo(
    () => sectors.flatMap((s) => s.items.filter((it) => it.focus).map((it) => ({ item: it, sector: s }))),
    [sectors]
  )

  const capture = async (e) => {
    e.preventDefault()
    const title = text.trim()
    if (!title) return
    setText('')
    setError('')
    try {
      await api.post('/inbox', { title })
      setInboxCount((n) => n + 1)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleDone = async (item) => {
    setSectors((prev) =>
      prev.map((s) => ({ ...s, items: s.items.map((it) => (it.id === item.id ? { ...it, done: !it.done } : it)) }))
    )
    try {
      await api.put(`/sector-items/${item.id}`, { done: !item.done })
    } catch (err) {
      setError(err.message)
      load()
    }
  }

  if (!loaded) return null

  return (
    <div className="home-panel priorities-panel">
      <div className="home-panel-header">
        <span className="kicker">Vider ma tête · priorités de la semaine</span>
        <Link className="home-panel-btn" to="/secteurs">Mes secteurs</Link>
      </div>

      {error && <p className="error">{error}</p>}

      <form className="sec-add" onSubmit={capture}>
        <input
          type="text"
          placeholder="Une idée, une tâche, un souci… (je range plus tard)"
          aria-label="Ajouter dans la boîte d'entrée"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit">Ajouter</button>
      </form>
      <p className="sec-hint">
        {saved ? '✓ Noté dans la boîte d’entrée.' : `${inboxCount} élément${inboxCount > 1 ? 's' : ''} à ranger dans la boîte d'entrée.`}
      </p>

      {sectors.length === 0 ? (
        <p className="home-empty">
          Pas encore de secteurs. <Link to="/secteurs">Organise ta vie par secteur</Link> pour choisir tes priorités.
        </p>
      ) : focusList.length === 0 ? (
        <p className="home-empty">
          Aucune priorité choisie. Ouvre <Link to="/secteurs">tes secteurs</Link> et marque jusqu'à 3 tâches par secteur avec l'étoile.
        </p>
      ) : (
        <ul className="priorities-list">
          {focusList.map(({ item, sector }) => (
            <li className={`sec-row${item.done ? ' done' : ''}`} key={item.id}>
              <input
                type="checkbox"
                id={`home-focus-${item.id}`}
                checked={item.done}
                onChange={() => toggleDone(item)}
              />
              <label className="sec-row-text" htmlFor={`home-focus-${item.id}`}>
                {item.title}
                <span className="sec-tag">
                  <span className="sec-dot" style={{ background: sector.color }} />
                  {sector.name}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
