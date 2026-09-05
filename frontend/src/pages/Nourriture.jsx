import { Fragment, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const MEALS = [
  { value: 'petit_dej', label: 'Petit-déj' },
  { value: 'dejeuner', label: 'Déjeuner' },
]

const PALETTE = [
  '#c17a4a', '#5c7f9c', '#6f8f6a', '#a9673f', '#ab9bc9',
  '#cf9a55', '#8bbdb8', '#b5482f', '#9c8ba0', '#7c9a5c',
]

export default function Nourriture() {
  const [items, setItems] = useState([])
  const [slots, setSlots] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [eraser, setEraser] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PALETTE[0])
  const [error, setError] = useState('')

  const loadItems = () => api.get('/food/items').then(setItems).catch((e) => setError(e.message))
  const loadSlots = () => api.get('/food/slots').then(setSlots).catch((e) => setError(e.message))

  useEffect(() => {
    loadItems()
    loadSlots()
  }, [])

  useEffect(() => {
    if (!selectedId && items.length > 0) setSelectedId(items[0].id)
  }, [items, selectedId])

  const slotMap = useMemo(() => {
    const map = new Map()
    for (const s of slots) map.set(`${s.day_of_week}-${s.meal_type}`, s)
    return map
  }, [slots])

  const itemById = useMemo(() => {
    const map = new Map()
    for (const it of items) map.set(it.id, it)
    return map
  }, [items])

  const filledCount = slots.length

  const paintSlot = async (day, mealType) => {
    setError('')
    try {
      if (eraser) {
        const key = `${day}-${mealType}`
        if (!slotMap.has(key)) return
        await api.del(`/food/slots?day_of_week=${day}&meal_type=${mealType}`)
        setSlots((prev) => prev.filter((s) => !(s.day_of_week === day && s.meal_type === mealType)))
      } else {
        if (!selectedId) return
        const saved = await api.put('/food/slots', { day_of_week: day, meal_type: mealType, food_item_id: selectedId })
        setSlots((prev) => {
          const next = prev.filter((s) => !(s.day_of_week === day && s.meal_type === mealType))
          next.push(saved)
          return next
        })
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const cycleColor = () => {
    const idx = PALETTE.indexOf(newColor)
    setNewColor(PALETTE[(idx + 1) % PALETTE.length])
  }

  const addItem = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setError('')
    try {
      await api.post('/food/items', { name: newName.trim(), color: newColor })
      setNewName('')
      setNewColor(PALETTE[(PALETTE.indexOf(newColor) + 1) % PALETTE.length])
      loadItems()
    } catch (err) {
      setError(err.message)
    }
  }

  const removeItem = async (id) => {
    if (!confirm('Supprimer cet aliment et le retirer du tableau ?')) return
    await api.del(`/food/items/${id}`)
    if (selectedId === id) setSelectedId(null)
    loadItems()
    loadSlots()
  }

  return (
    <section>
      <PageHeader
        kicker={`${items.length} aliments · Semaine type`}
        title="Nourriture."
        description="Petit-déj et déjeuner de la semaine, planifiés à l'avance. Pas de dîner ici — on garde ça libre."
        statNumber={`${filledCount}/14`}
        statLabel="repas planifiés"
      />

      <hr className="page-rule" />

      {error && <p className="error">{error}</p>}

      <div className="cal168-toolbar">
        <div className="cal168-chips">
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              className={`cal168-chip${selectedId === it.id && !eraser ? ' active' : ''}`}
              onClick={() => { setSelectedId(it.id); setEraser(false) }}
              onContextMenu={(e) => { e.preventDefault(); removeItem(it.id) }}
              title="Clic droit pour supprimer"
            >
              <span className="cal168-chip-swatch" style={{ background: it.color }} />
              {it.icon && <span>{it.icon}</span>}
              <span>{it.name}</span>
              <span
                className="cal168-chip-remove"
                role="button"
                aria-label={`Supprimer ${it.name}`}
                onClick={(e) => { e.stopPropagation(); removeItem(it.id) }}
              >
                ✕
              </span>
            </button>
          ))}
          <button
            type="button"
            className={`cal168-chip cal168-gomme-btn${eraser ? ' active' : ''}`}
            onClick={() => setEraser((v) => !v)}
          >
            ⌫ Gomme
          </button>
        </div>

        <form className="cal168-add-row" onSubmit={addItem}>
          <button type="button" className="cal168-color-swatch-btn" style={{ background: newColor }} onClick={cycleColor} aria-label="Changer la couleur" />
          <input
            className="cal168-add-input"
            placeholder="Nouvel aliment / plat..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="submit" className="cal168-add-btn">+ Ajouter</button>
        </form>
      </div>

      <div className="food-grid-wrapper">
        <div className="food-grid">
          <div className="food-corner" />
          {MEALS.map((m) => (
            <div key={m.value} className="food-meal-label">{m.label}</div>
          ))}

          {DAYS.map((label, day) => (
            <Fragment key={label}>
              <div className="food-day-label">{label}</div>
              {MEALS.map((m) => {
                const slot = slotMap.get(`${day}-${m.value}`)
                const item = slot ? itemById.get(slot.food_item_id) : null
                return (
                  <div
                    key={m.value}
                    className="food-cell"
                    style={{ background: item ? item.color : undefined }}
                    onClick={() => paintSlot(day, m.value)}
                  >
                    {item && (
                      <span className="food-cell-label">
                        {item.icon && <span>{item.icon} </span>}
                        {item.name}
                      </span>
                    )}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>

      <p className="cal168-hint">Choisis un aliment puis clique sur une case · clic droit sur un aliment pour le supprimer.</p>
    </section>
  )
}
