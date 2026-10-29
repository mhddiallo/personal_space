import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

// Accueil : un accès direct à la lecture des duas, à ouvrir juste après chaque salat.
export default function DuasShortcut() {
  const [count, setCount] = useState(null)

  useEffect(() => {
    api.get('/duas').then((list) => setCount(list.length)).catch(() => setCount(0))
  }, [])

  if (!count) return null

  return (
    <Link className="duas-shortcut" to="/prieres?lire=1">
      <span className="duas-shortcut-icon">🤲</span>
      <span className="duas-shortcut-text">
        <strong>Après la salat</strong>
        <span>Lire mes {count} dua{count > 1 ? 's' : ''}</span>
      </span>
      <span className="duas-shortcut-go">▶</span>
    </Link>
  )
}
