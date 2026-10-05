import { useState } from 'react'
import { authToken, BASE } from '../api/client'

export default function Login({ onSuccess }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        throw new Error(detail.detail || 'Code incorrect')
      }
      const data = await res.json()
      authToken.set(data.token)
      onSuccess()
    } catch (err) {
      setError(err.message)
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand-mark">M</div>
        <div className="login-title serif-italic">Maison.</div>
        <p className="login-description">Entre ton code à 8 chiffres pour accéder à ton espace.</p>
        <input
          className="login-input"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
          placeholder="········"
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" className="login-submit" disabled={loading || code.length !== 8}>
          {loading ? 'Vérification…' : 'Entrer'}
        </button>
      </form>
    </div>
  )
}
