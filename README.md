# Espace Personnel

Application pour suivre et organiser ma vie : journal, vocabulaire/expressions, calendrier 168 heures, répertoire de contacts.

## Stack

- **Backend** : FastAPI + SQLAlchemy + SQLite (`backend/`)
- **Frontend** : React + Vite, mobile-first (`frontend/`)

## Lancer en local

### Backend

```bash
cd backend
python -m venv venv
source venv/Scripts/activate   # Windows (git bash)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

L'API est servie sur `http://127.0.0.1:8000`, la base SQLite (`espace_personnel.db`) et les photos uploadées (`uploads/photos/`) sont créées automatiquement.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

L'app est servie sur `http://localhost:5173` et proxy les requêtes `/api` et `/uploads` vers le backend (voir `vite.config.js`).

## Modules

- **Journal** : écrire et archiver des entrées datées.
- **Vocabulaire** : mots et expressions célèbres, avec définition et source.
- **Calendrier 168h** : grille hebdomadaire (7 jours × 24h) pour visualiser comment le temps est réparti, par catégories.
- **Répertoire** : contacts avec photo, lien, anniversaire, où rencontrés, et membres de la famille.

## Déploiement

Pas encore configuré. Prévu : backend sur un service type Render/Fly.io, frontend sur Vercel/Netlify, avec la base SQLite remplacée ou montée sur un volume persistant selon l'hébergeur choisi.
