import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'

const emptyForm = { title: '', due_date: '' }

function formatDate(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function isOverdue(task) {
  if (!task.due_date || task.done) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [y, m, d] = task.due_date.split('-').map(Number)
  return new Date(y, m - 1, d) < today
}

export default function Todo() {
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [showDone, setShowDone] = useState(false)

  const load = () => api.get('/tasks').then(setTasks).catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const pending = useMemo(() => tasks.filter((t) => !t.done), [tasks])
  const done = useMemo(() => tasks.filter((t) => t.done), [tasks])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setError('')
    try {
      await api.post('/tasks', {
        title: form.title.trim(),
        due_date: form.due_date || null,
      })
      setForm(emptyForm)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleDone = async (task) => {
    setError('')
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)))
    try {
      await api.put(`/tasks/${task.id}`, { done: !task.done })
    } catch (err) {
      setError(err.message)
      load()
    }
  }

  const remove = async (id) => {
    await api.del(`/tasks/${id}`)
    load()
  }

  return (
    <section>
      <PageHeader
        kicker={`${pending.length} en cours · ${done.length} terminées`}
        title="Ma to-do."
        description="Ce qu'il reste à faire, dans l'ordre où ça arrive. Une case cochée, c'est un poids en moins."
        statNumber={pending.length}
        statLabel="tâches à faire"
      />

      <hr className="page-rule" />

      <form className="todo-add-row" onSubmit={submit}>
        <input
          className="todo-add-input"
          placeholder="Nouvelle tâche..."
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <input
          type="date"
          className="todo-add-date"
          value={form.due_date}
          onChange={(e) => setForm({ ...form, due_date: e.target.value })}
        />
        <button type="submit" className="todo-add-btn">+ Ajouter</button>
      </form>

      {error && <p className="error">{error}</p>}

      <div className="todo-list">
        {pending.length === 0 && <p className="home-empty">Rien à faire pour l'instant.</p>}
        {pending.map((task) => (
          <div className={`todo-row${isOverdue(task) ? ' overdue' : ''}`} key={task.id}>
            <label className="todo-check">
              <input type="checkbox" checked={task.done} onChange={() => toggleDone(task)} />
            </label>
            <span className="todo-title">{task.title}</span>
            {task.due_date && (
              <span className="todo-date">
                {isOverdue(task) && '⚠ '}
                {formatDate(task.due_date)}
              </span>
            )}
            <button type="button" className="todo-remove" onClick={() => remove(task.id)} aria-label="Supprimer">✕</button>
          </div>
        ))}
      </div>

      {done.length > 0 && (
        <div className="todo-done-section">
          <button type="button" className="todo-done-toggle" onClick={() => setShowDone((v) => !v)}>
            {showDone ? '▾' : '▸'} Terminées · {done.length}
          </button>
          {showDone && (
            <div className="todo-list">
              {done.map((task) => (
                <div className="todo-row done" key={task.id}>
                  <label className="todo-check">
                    <input type="checkbox" checked={task.done} onChange={() => toggleDone(task)} />
                    <span className="todo-check-box" />
                  </label>
                  <span className="todo-title">{task.title}</span>
                  {task.due_date && <span className="todo-date">{formatDate(task.due_date)}</span>}
                  <button type="button" className="todo-remove" onClick={() => remove(task.id)} aria-label="Supprimer">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
