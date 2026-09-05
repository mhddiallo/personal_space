import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app import auth
from app.database import Base, PHOTOS_DIR, engine
from app.routers import blueprint, books, calendar, contacts, finances, food, goals, journal, todo, vocabulary

Base.metadata.create_all(bind=engine)
PHOTOS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Espace Personnel API")

# En local : pas de CORS_ORIGINS défini -> tout est autorisé (proxy Vite de toute façon).
# En prod (Render) : CORS_ORIGINS="https://ton-frontend.onrender.com" restreint l'accès.
_cors_origins_env = os.environ.get("CORS_ORIGINS")
allow_origins = [o.strip() for o in _cors_origins_env.split(",")] if _cors_origins_env else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=PHOTOS_DIR.parent), name="uploads")

app.include_router(auth.router)

protected = [Depends(auth.require_auth)]
app.include_router(journal.router, dependencies=protected)
app.include_router(vocabulary.router, dependencies=protected)
app.include_router(contacts.router, dependencies=protected)
app.include_router(calendar.router, dependencies=protected)
app.include_router(blueprint.router, dependencies=protected)
app.include_router(goals.router, dependencies=protected)
app.include_router(finances.router, dependencies=protected)
app.include_router(todo.router, dependencies=protected)
app.include_router(books.router, dependencies=protected)
app.include_router(food.router, dependencies=protected)


@app.get("/api/health")
def health():
    return {"status": "ok"}
