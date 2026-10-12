// Logique partagée entre la page « Ma semaine » et le bloc « Aujourd'hui » de l'Accueil.

export const KINDS = [
  { value: 'interdit', label: 'Interdit', icon: '🚫', color: '#b5482f' },
  { value: 'limite', label: 'Limité', icon: '⏳', color: '#cf9a55' },
  { value: 'creneau', label: 'Créneau', icon: '🕒', color: '#5c7f9c' },
  { value: 'a_faire', label: 'À faire', icon: '✔️', color: '#6f8f6a' },
]

export const KIND_BY_VALUE = Object.fromEntries(KINDS.map((k) => [k.value, k]))

// 0 = lundi ... 6 = dimanche (comme le backend)
export const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
export const WEEKDAY_LONG = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

// Dates en heure locale (toISOString décalerait d'un jour selon le fuseau).
export function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso, n) {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function weekdayOf(iso) {
  return (fromISO(iso).getDay() + 6) % 7
}

export function mondayOf(iso) {
  return addDays(iso, -weekdayOf(iso))
}

export function timeText(rule) {
  if (rule.time_label) return rule.time_label
  if (rule.start_time && rule.end_time) return `${rule.start_time} → ${rule.end_time}`
  return rule.start_time || ''
}

// Les règles sans horaire (interdits) d'abord, puis par heure, puis par position.
export function sortRules(rules) {
  return [...rules].sort((a, b) => {
    const ta = a.start_time || ''
    const tb = b.start_time || ''
    if (ta !== tb) return ta < tb ? -1 : 1
    return a.position - b.position
  })
}

// Une règle s'applique à une date si la semaine type la contient, sauf exception « remove »,
// ou si une exception « add » l'ajoute.
export function isRuleActive(rule, dateISO, overrides) {
  const override = overrides.find((o) => o.rule_id === rule.id && o.date === dateISO)
  if (override) return override.action === 'add'
  return rule.weekdays.includes(weekdayOf(dateISO))
}

export function rulesForDate(rules, dateISO, overrides) {
  return sortRules(rules.filter((r) => isRuleActive(r, dateISO, overrides)))
}

// Proposition de départ (semaine type). Jours : 0 = lundi ... 6 = dimanche.
export const STARTER_RULES = [
  {
    title: 'Réveil de nuit · prière',
    kind: 'a_faire',
    icon: '🌙',
    start_time: '04:30',
    end_time: '05:00',
    note: 'Nuits du dimanche au lundi et du mercredi au jeudi.',
    weekdays: [0, 3],
  },
  {
    title: 'Coucher tôt',
    kind: 'a_faire',
    icon: '😴',
    start_time: '21:30',
    note: "Veille d'une nuit de prière : lumière éteinte à 21h30.",
    weekdays: [2, 6],
  },
  {
    title: 'Coucher',
    kind: 'a_faire',
    icon: '😴',
    start_time: '22:30',
    time_label: '22h30 (23h max)',
    weekdays: [0, 1, 3, 4, 5],
  },
  {
    title: 'Téléphone hors de la chambre',
    kind: 'a_faire',
    icon: '📵',
    start_time: '22:00',
    note: 'Le téléphone se branche dans une autre pièce. Un vrai réveil pour le matin.',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    title: 'Arrivée au bureau',
    kind: 'a_faire',
    icon: '💼',
    start_time: '08:30',
    end_time: '09:30',
    note: '1. Plan de la journée (5 min)\n2. Cours de certification (45 min) avant les réunions\n3. Pas de réseaux ni de messages avant midi',
    weekdays: [0, 1, 2, 3, 4],
  },
  {
    title: 'Messages & réseaux',
    kind: 'creneau',
    icon: '💬',
    start_time: '12:45',
    end_time: '13:15',
    time_label: '12h45–13h15 · 19h30–20h',
    note: 'WhatsApp, Instagram, X, LinkedIn : seulement dans ces deux fenêtres. En dehors, applications fermées.',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    title: 'Lecture',
    kind: 'a_faire',
    icon: '📚',
    start_time: '20:00',
    end_time: '21:00',
    note: '30 pages minimum.',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    title: 'Pas de YouTube, films ni séries',
    kind: 'interdit',
    icon: '🚫',
    note: 'Du dimanche au jeudi.',
    weekdays: [6, 0, 1, 2, 3],
  },
  {
    title: 'Pas de YouTube',
    kind: 'interdit',
    icon: '🚫',
    note: "Le film de ce soir reste autorisé.",
    weekdays: [4],
  },
  {
    title: 'YouTube · créneau',
    kind: 'limite',
    icon: '▶️',
    start_time: '15:00',
    end_time: '17:00',
    note: 'Le seul créneau YouTube de la semaine. Alarme à 17h.',
    weekdays: [5],
  },
  {
    title: 'Film / série · créneau',
    kind: 'creneau',
    icon: '🎬',
    start_time: '20:30',
    end_time: '22:30',
    weekdays: [4, 5],
  },
]
