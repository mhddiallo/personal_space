import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Placeholder from './components/Placeholder'
import Journal from './pages/Journal'
import Vocabulary from './pages/Vocabulary'
import Repertoire from './pages/Repertoire'
import Calendar168 from './pages/Calendar168'
import Goals from './pages/Goals'
import Home from './pages/Home'
import Blueprint from './pages/Blueprint'
import Todo from './pages/Todo'
import Lecture from './pages/Lecture'
import Nourriture from './pages/Nourriture'
import Login from './pages/Login'
import { authToken } from './api/client'

function App() {
  const [authed, setAuthed] = useState(() => Boolean(authToken.get()))

  useEffect(() => {
    const onUnauthorized = () => setAuthed(false)
    window.addEventListener('espace-unauthorized', onUnauthorized)
    return () => window.removeEventListener('espace-unauthorized', onUnauthorized)
  }, [])

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />
  }

  const logout = () => {
    authToken.clear()
    setAuthed(false)
  }

  return (
    <Routes>
      <Route element={<Layout onLogout={logout} />}>
        <Route path="/" element={<Home />} />
        <Route path="/objectifs" element={<Goals />} />
        <Route path="/todo" element={<Todo />} />
        <Route path="/lecture" element={<Lecture />} />
        <Route path="/nourriture" element={<Nourriture />} />
        <Route path="/calendrier" element={<Calendar168 />} />
        <Route path="/blueprint" element={<Blueprint />} />
        <Route
          path="/finances"
          element={
            <Placeholder
              kicker="Revenus · Dépenses · Épargne"
              title="Finances."
              description="Le suivi de tes transactions et de tes objectifs financiers."
            />
          }
        />
        <Route path="/journal" element={<Journal />} />
        <Route path="/vocabulaire" element={<Vocabulary />} />
        <Route path="/repertoire" element={<Repertoire />} />
      </Route>
    </Routes>
  )
}

export default App
