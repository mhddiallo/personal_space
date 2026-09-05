import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import PageHeader from '../components/PageHeader'

const CATEGORIES = [
  { value: 'ami_proche', label: 'Ami(e) proche' },
  { value: 'famille', label: 'Famille' },
  { value: 'collegue', label: 'Collègue' },
  { value: 'cousin', label: 'Cousin(e)' },
  { value: 'connaissance', label: 'Connaissance' },
  { value: 'autre', label: 'Autre' },
]

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]))

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

// Chaque contact est recontacté tous les 4 mois, toujours au même jour :
// contact_month, contact_month + 4, contact_month + 8.
function contactOccMonths(contact) {
  if (!contact.contact_month) return []
  const m = contact.contact_month
  return [m, ((m - 1 + 4) % 12) + 1, ((m - 1 + 8) % 12) + 1]
}

// Fenêtre courante : la dernière échéance passée (ou aujourd'hui) et la prochaine à venir.
function contactWindow(contact) {
  if (!contact.contact_day || !contact.contact_month) return null
  const { contact_day: day, contact_month: month } = contact
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const candidates = []
  for (let year = today.getFullYear() - 1; year <= today.getFullYear() + 1; year++) {
    for (let k = 0; k < 3; k++) {
      candidates.push(new Date(year, month - 1 + 4 * k, day))
    }
  }
  candidates.sort((a, b) => a - b)
  let previous = null
  let next = null
  for (const c of candidates) {
    if (c <= today) previous = c
    if (c > today && !next) next = c
  }
  return { previous, next }
}

function daysUntilNextContact(contact) {
  const w = contactWindow(contact)
  if (!w || !w.next) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((w.next - today) / (1000 * 60 * 60 * 24))
}

function isContactedThisWindow(contact) {
  const w = contactWindow(contact)
  if (!w || !w.previous) return true
  if (!contact.last_contacted_at) return false
  return new Date(contact.last_contacted_at) >= w.previous
}

function formatDayMonth(date) {
  if (!date) return ''
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]}`
}

const emptyForm = {
  first_name: '',
  last_name: '',
  category: 'ami_proche',
  met_where: '',
  birth_day: '',
  birth_month: '',
  birth_year: '',
  notes: '',
}

const emptyFamilyMember = { name: '', relation_to_contact: '' }

const RELATIONS = [
  'Père', 'Mère', 'Mari', 'Femme', 'Fils', 'Fille', 'Frère', 'Sœur',
  'Grand-père', 'Grand-mère', 'Petit-fils', 'Petite-fille',
  'Oncle', 'Tante', 'Neveu', 'Nièce', 'Cousin', 'Cousine',
  'Beau-père', 'Belle-mère', 'Beau-frère', 'Belle-sœur', 'Gendre', 'Belle-fille',
  'Ami(e)',
]
const CUSTOM_RELATION = '__autre__'

function initials(contact) {
  const a = contact.first_name?.[0] || ''
  const b = contact.last_name?.[0] || ''
  return (a + b).toUpperCase()
}

function daysUntilBirthday(contact) {
  if (!contact.birth_day || !contact.birth_month) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let next = new Date(today.getFullYear(), contact.birth_month - 1, contact.birth_day)
  if (next < today) next = new Date(today.getFullYear() + 1, contact.birth_month - 1, contact.birth_day)
  return Math.round((next - today) / (1000 * 60 * 60 * 24))
}

export default function Repertoire() {
  const [contacts, setContacts] = useState([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [groupBy, setGroupBy] = useState('categorie')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [familyMembers, setFamilyMembers] = useState([])
  const [customRelationIdx, setCustomRelationIdx] = useState(() => new Set())
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const load = () => api.get('/contacts').then(setContacts).catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const reminderQueue = useMemo(() => {
    return contacts
      .filter((c) => c.contact_day && c.contact_month && !isContactedThisWindow(c))
      .sort((a, b) => contactWindow(a).previous - contactWindow(b).previous)
  }, [contacts])

  const markContacted = async (id) => {
    setError('')
    try {
      await api.post(`/contacts/${id}/mark-contacted`)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setForm(emptyForm)
    setFamilyMembers([])
    setCustomRelationIdx(new Set())
    setPhotoFile(null)
    setPhotoPreview(null)
    setEditingId(null)
  }

  const openNew = () => {
    resetForm()
    setModalOpen(true)
  }

  const openEdit = (contact) => {
    setEditingId(contact.id)
    setForm({
      first_name: contact.first_name,
      last_name: contact.last_name || '',
      category: contact.category,
      met_where: contact.met_where || '',
      birth_day: contact.birth_day || '',
      birth_month: contact.birth_month || '',
      birth_year: contact.birth_year || '',
      notes: contact.notes || '',
    })
    const members = contact.family_members.map((m) => ({ name: m.name, relation_to_contact: m.relation_to_contact }))
    setFamilyMembers(members)
    setCustomRelationIdx(new Set(
      members
        .map((m, i) => (m.relation_to_contact && !RELATIONS.includes(m.relation_to_contact) ? i : null))
        .filter((i) => i !== null)
    ))
    setPhotoFile(null)
    setPhotoPreview(contact.photo_path || null)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    resetForm()
  }

  const addFamilyMember = () => setFamilyMembers([...familyMembers, { ...emptyFamilyMember }])
  const updateFamilyMember = (idx, key, value) => {
    const next = [...familyMembers]
    next[idx] = { ...next[idx], [key]: value }
    setFamilyMembers(next)
  }
  const removeFamilyMember = (idx) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== idx))
    setCustomRelationIdx((prev) => {
      const next = new Set()
      prev.forEach((i) => {
        if (i < idx) next.add(i)
        else if (i > idx) next.add(i - 1)
      })
      return next
    })
  }

  const selectRelation = (idx, value) => {
    if (value === CUSTOM_RELATION) {
      setCustomRelationIdx((prev) => new Set(prev).add(idx))
      updateFamilyMember(idx, 'relation_to_contact', '')
    } else {
      setCustomRelationIdx((prev) => {
        const next = new Set(prev)
        next.delete(idx)
        return next
      })
      updateFamilyMember(idx, 'relation_to_contact', value)
    }
  }

  const onPhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const payload = {
      ...form,
      birth_day: form.birth_day ? Number(form.birth_day) : null,
      birth_month: form.birth_month ? Number(form.birth_month) : null,
      birth_year: form.birth_year ? Number(form.birth_year) : null,
      family_members: familyMembers.filter((m) => m.name.trim()),
    }
    try {
      let contact
      if (editingId) {
        contact = await api.put(`/contacts/${editingId}`, payload)
      } else {
        contact = await api.post('/contacts', payload)
      }
      if (photoFile) {
        const fd = new FormData()
        fd.append('file', photoFile)
        await api.post(`/contacts/${contact.id}/photo`, fd)
      }
      closeModal()
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer ce contact ?')) return
    await api.del(`/contacts/${id}`)
    if (editingId === id) closeModal()
    load()
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter((c) => {
      const haystack = [
        c.first_name, c.last_name, c.met_where, c.notes,
        ...(c.family_members || []).map((m) => m.name),
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [contacts, search])

  const groups = useMemo(() => {
    if (groupBy === 'categorie') {
      const map = new Map()
      CATEGORIES.forEach((c) => map.set(c.value, []))
      filtered.forEach((c) => {
        if (!map.has(c.category)) map.set(c.category, [])
        map.get(c.category).push(c)
      })
      return [...map.entries()]
        .filter(([, list]) => list.length > 0)
        .map(([key, list]) => ({ key, title: CATEGORY_LABEL[key] || key, list }))
    }
    if (groupBy === 'lieu') {
      const map = new Map()
      filtered.forEach((c) => {
        const key = c.met_where?.trim() || 'Sans lieu'
        if (!map.has(key)) map.set(key, [])
        map.get(key).push(c)
      })
      return [...map.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, list]) => ({ key, title: key, list }))
    }
    if (groupBy === 'contact') {
      // un contact apparaît dans les 3 mois où il revient (tous les 4 mois)
      const map = new Map()
      filtered.forEach((c) => {
        contactOccMonths(c).forEach((month) => {
          if (!map.has(month)) map.set(month, [])
          map.get(month).push(c)
        })
      })
      return [...map.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([month, list]) => ({
          key: month,
          title: MONTHS[month - 1],
          list: list.sort((a, b) => a.contact_day - b.contact_day),
        }))
    }
    // anniversaire — grouped by month, chronological order
    const map = new Map()
    filtered.forEach((c) => {
      if (!c.birth_month) return
      if (!map.has(c.birth_month)) map.set(c.birth_month, [])
      map.get(c.birth_month).push(c)
    })
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([month, list]) => ({
        key: month,
        title: MONTHS[month - 1],
        list: list.sort((a, b) => a.birth_day - b.birth_day),
      }))
  }, [filtered, groupBy])

  const presentLetters = useMemo(
    () => new Set(contacts.map((c) => (c.first_name?.[0] || '').toUpperCase())),
    [contacts]
  )

  const jumpToLetter = (letter) => {
    const target = contacts.find((c) => (c.first_name?.[0] || '').toUpperCase() === letter)
    if (!target) return
    document.getElementById(`contact-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const upcoming = useMemo(() => {
    return contacts
      .map((c) => ({ contact: c, days: daysUntilBirthday(c) }))
      .filter((x) => x.days !== null && x.days <= 30)
      .sort((a, b) => a.days - b.days)
  }, [contacts])

  return (
    <section>
      <PageHeader
        kicker={`${contacts.length} personnes · Carnet privé`}
        title="Mon répertoire."
        description="Les gens, leur histoire, leur entourage. Se souvenir d'un prénom, d'un lien, d'une date — c'est une forme de soin."
        statNumber={upcoming.length}
        statLabel="anniversaires · 30 jours"
      />

      <hr className="page-rule" />

      {upcoming.length > 0 && (
        <div className="repertoire-banner">
          <span className="repertoire-banner-label">🎂 À venir</span>
          <span className="repertoire-banner-sep">|</span>
          {upcoming.slice(0, 3).map(({ contact, days }) => (
            <span className="repertoire-banner-person" key={contact.id}>
              <span className="contact-avatar" style={{ width: 26, height: 26, fontSize: '0.7rem' }}>
                {initials(contact)}
              </span>
              <strong>{contact.first_name} {contact.last_name}</strong>
              <span className="when">{days === 0 ? "aujourd'hui" : `dans ${days} jours`}</span>
            </span>
          ))}
        </div>
      )}

      {contacts.length > 0 && (
        <div className="reminders-panel">
          <div className="reminders-header">
            <div>
              <div className="reminders-title">📞 Rappels · à recontacter</div>
              <div className="reminders-sub">
                Chaque personne revient tous les 4 mois, au même jour · retrouve-les aussi dans le filtre « Contact »
              </div>
            </div>
            <div className="reminders-progress">
              {contacts.length - reminderQueue.length} / {contacts.length} contactés ce cycle
            </div>
          </div>

          {reminderQueue.length === 0 ? (
            <p className="reminders-empty">Tout le monde a été recontacté pour sa fenêtre en cours.</p>
          ) : (
            <div className="reminders-list">
              {reminderQueue.map((contact) => (
                <div className="reminders-row" key={contact.id}>
                  <span className="contact-avatar" style={{ width: 30, height: 30, fontSize: '0.75rem' }}>
                    {contact.photo_path ? <img src={contact.photo_path} alt="" /> : initials(contact)}
                  </span>
                  <div className="reminders-row-info">
                    <span className="reminders-row-name">{contact.first_name} {contact.last_name}</span>
                    <span
                      className="reminders-row-category"
                      style={{ color: `var(--cat-${contact.category})` }}
                    >
                      {CATEGORY_LABEL[contact.category] || contact.category}
                    </span>
                  </div>
                  <span className="reminders-row-date">
                    {formatDayMonth(contactWindow(contact).previous)}
                  </span>
                  <label className="reminders-check">
                    <input type="checkbox" onChange={() => markContacted(contact.id)} />
                    <span>Contacté</span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="repertoire-toolbar">
        <input
          className="repertoire-search"
          placeholder="Rechercher un nom, un lieu, une note, un proche..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="repertoire-toggle-group">
          <button className={groupBy === 'categorie' ? 'active' : ''} type="button" onClick={() => setGroupBy('categorie')}>
            Catégorie
          </button>
          <button className={groupBy === 'lieu' ? 'active' : ''} type="button" onClick={() => setGroupBy('lieu')}>
            Lieu
          </button>
          <button className={groupBy === 'anniversaire' ? 'active' : ''} type="button" onClick={() => setGroupBy('anniversaire')}>
            Anniversaire
          </button>
          <button className={groupBy === 'contact' ? 'active' : ''} type="button" onClick={() => setGroupBy('contact')}>
            Contact
          </button>
        </div>
        <button type="button" onClick={openNew}>+ Nouvelle fiche</button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="repertoire-body">
        <div className="repertoire-groups">
          {groups.length === 0 && <p className="repertoire-empty">Aucun contact pour l'instant.</p>}
          {groups.map((group) => (
            <div className="repertoire-group" key={group.key}>
              <div className="repertoire-group-title">
                {group.title} · {group.list.length}
              </div>
              <div className="repertoire-cards">
                {group.list.map((contact) => (
                  <div
                    className="contact-card-v2"
                    id={`contact-${contact.id}`}
                    key={contact.id}
                    onClick={() => openEdit(contact)}
                  >
                    <div className="contact-avatar">
                      {contact.photo_path ? <img src={contact.photo_path} alt="" /> : initials(contact)}
                    </div>
                    <div className="contact-card-v2-info">
                      <div className="contact-card-v2-name serif-italic">
                        {contact.first_name} {contact.last_name}
                      </div>
                      <div
                        className="contact-card-v2-category"
                        style={{ color: `var(--cat-${contact.category})` }}
                      >
                        {CATEGORY_LABEL[contact.category] || contact.category}
                      </div>
                      {contact.met_where && (
                        <div className="contact-card-v2-place">📍 {contact.met_where}</div>
                      )}
                    </div>
                    <div className="contact-card-v2-badges">
                      {contact.birth_month && <span className="contact-card-v2-cake">🎂</span>}
                      {contact.contact_month && (
                        <span
                          className={`contact-card-v2-phone${!isContactedThisWindow(contact) ? ' due' : ''}`}
                          title={!isContactedThisWindow(contact) ? 'À recontacter' : 'Contacté(e) pour cette période'}
                        >
                          📞
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="repertoire-alphabet">
          {ALPHABET.map((letter) => (
            <span
              key={letter}
              className={presentLetters.has(letter) ? 'active' : ''}
              onClick={() => presentLetters.has(letter) && jumpToLetter(letter)}
              style={{ cursor: presentLetters.has(letter) ? 'pointer' : 'default' }}
            >
              {letter}
            </span>
          ))}
        </div>
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" type="button" onClick={closeModal}>✕</button>
            <div className="modal-title">{editingId ? 'Modifier la fiche' : 'Nouvelle fiche'}</div>

            <form onSubmit={submit}>
              <div className="modal-photo-row">
                <label className="modal-photo-placeholder">
                  {photoPreview ? <img src={photoPreview} alt="" /> : 'Ajouter une photo'}
                  <input type="file" accept="image/*" hidden onChange={onPhotoChange} />
                </label>
                <div className="modal-fields-inline">
                  <div>
                    <span className="field-label">Prénom</span>
                    <input
                      className="field-input"
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <span className="field-label">Nom</span>
                    <input
                      className="field-input"
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="field-block">
                <span className="field-label">Catégorie</span>
                <div className="category-pills">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={form.category === c.value ? 'active' : ''}
                      onClick={() => setForm({ ...form, category: c.value })}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field-block">
                <span className="field-label">Lieu / Contexte de rencontre</span>
                <input
                  className="field-input"
                  placeholder="École, Boulot, Quartier, Mariage de X..."
                  value={form.met_where}
                  onChange={(e) => setForm({ ...form, met_where: e.target.value })}
                />
              </div>

              <div className="field-block">
                <div className="birthday-grid">
                  <div>
                    <span className="field-label">Jour anniv.</span>
                    <input
                      className="field-input"
                      type="number"
                      min="1"
                      max="31"
                      placeholder="JJ"
                      value={form.birth_day}
                      onChange={(e) => setForm({ ...form, birth_day: e.target.value })}
                    />
                  </div>
                  <div>
                    <span className="field-label">Mois anniv.</span>
                    <select
                      className="field-select"
                      value={form.birth_month}
                      onChange={(e) => setForm({ ...form, birth_month: e.target.value })}
                    >
                      <option value="">—</option>
                      {MONTHS.map((m, idx) => (
                        <option key={m} value={idx + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="field-label">Année (optionnel)</span>
                    <input
                      className="field-input"
                      type="number"
                      placeholder="AAAA"
                      value={form.birth_year}
                      onChange={(e) => setForm({ ...form, birth_year: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="field-block">
                <span className="field-label">Rappel · tous les 4 mois</span>
                {editingId ? (
                  (() => {
                    const editingContact = contacts.find((c) => c.id === editingId)
                    if (!editingContact || !editingContact.contact_day) return null
                    const window = contactWindow(editingContact)
                    const done = isContactedThisWindow(editingContact)
                    return (
                      <div className="contact-reminder-info">
                        <span>
                          Date fixe : le <strong>{editingContact.contact_day} {MONTHS[editingContact.contact_month - 1]}</strong>{' '}
                          (assignée automatiquement le {new Date(editingContact.created_at).toLocaleDateString('fr-FR')})
                        </span>
                        <span>
                          Prochaine échéance : <strong>{formatDayMonth(window.next)}</strong>
                          {' — '}
                          {done ? '✓ déjà contacté(e) pour cette période' : 'à recontacter'}
                        </span>
                        {!done && (
                          <button type="button" className="secondary" onClick={() => markContacted(editingContact.id)}>
                            Marquer comme contacté(e)
                          </button>
                        )}
                      </div>
                    )
                  })()
                ) : (
                  <p className="contact-reminder-info-empty">
                    La date sera assignée automatiquement à la création de la fiche.
                  </p>
                )}
              </div>

              <div className="field-block">
                <span className="field-label">Notes</span>
                <textarea
                  className="field-textarea"
                  rows={3}
                  placeholder="Comment vous vous êtes rencontrés, détails à retenir..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="field-block">
                <span className="field-label">Entourage</span>
                {familyMembers.map((member, idx) => {
                  const isCustom = customRelationIdx.has(idx)
                  return (
                    <div className="entourage-row" key={idx}>
                      <input
                        placeholder="Nom"
                        value={member.name}
                        onChange={(e) => updateFamilyMember(idx, 'name', e.target.value)}
                      />
                      <select
                        className="entourage-relation-select"
                        value={isCustom ? CUSTOM_RELATION : member.relation_to_contact}
                        onChange={(e) => selectRelation(idx, e.target.value)}
                      >
                        <option value="">— Lien —</option>
                        {RELATIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                        <option value={CUSTOM_RELATION}>Autre...</option>
                      </select>
                      {isCustom && (
                        <input
                          placeholder="Préciser le lien"
                          value={member.relation_to_contact}
                          onChange={(e) => updateFamilyMember(idx, 'relation_to_contact', e.target.value)}
                        />
                      )}
                      <button type="button" className="danger" onClick={() => removeFamilyMember(idx)}>×</button>
                    </div>
                  )
                })}
                <button type="button" className="secondary" onClick={addFamilyMember}>+ Ajouter un proche</button>
              </div>

              {error && <p className="error">{error}</p>}

              <div className="modal-actions">
                <button type="submit">Enregistrer</button>
                <button type="button" className="secondary" onClick={closeModal}>Annuler</button>
                {editingId && (
                  <button type="button" className="danger" onClick={() => remove(editingId)}>
                    Supprimer
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
