"""Transfère les données de la base SQLite locale vers Supabase Postgres.

Usage :
    1. Récupère l'URL de connexion Postgres dans Supabase
       (Project Settings > Database > Connection string > URI).
    2. Lance :
       SUPABASE_DATABASE_URL="postgresql://postgres:...@....supabase.co:5432/postgres" \
           venv/Scripts/python.exe migrate_to_supabase.py

Le script recrée les tables sur Supabase (si elles n'existent pas déjà) puis
copie toutes les lignes, table par table, dans l'ordre qui respecte les clés
étrangères. Les photos de contacts restent des chemins locaux
(/uploads/photos/...) après le transfert — il faudra les réuploader depuis
l'app une fois en ligne pour qu'elles partent vers Supabase Storage.
"""

import os
import sys

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(__file__))

from app import models  # noqa: E402
from app.database import Base, DB_PATH  # noqa: E402

SUPABASE_DATABASE_URL = os.environ.get("SUPABASE_DATABASE_URL")
if not SUPABASE_DATABASE_URL:
    raise SystemExit("Définis SUPABASE_DATABASE_URL avant de lancer ce script.")
if SUPABASE_DATABASE_URL.startswith("postgres://"):
    SUPABASE_DATABASE_URL = SUPABASE_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Ordre important : les tables enfants après leurs parents (clés étrangères).
TABLES_IN_ORDER = [
    models.JournalEntry,
    models.VocabularyEntry,
    models.Contact,
    models.FamilyMember,
    models.Activity,
    models.HourCell,
    models.BlueprintItem,
    models.Habit,
    models.Principle,
    models.Goal,
    models.KeyResult,
    models.Transaction,
    models.FinancialGoal,
    models.Task,
    models.Book,
    models.FoodItem,
    models.MealSlot,
]

sqlite_engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
pg_engine = create_engine(SUPABASE_DATABASE_URL, pool_pre_ping=True)

print(f"Source (locale)  : {DB_PATH}")
print(f"Destination      : {pg_engine.url.host}")

Base.metadata.create_all(bind=pg_engine)
print("Tables créées/vérifiées sur Supabase.")

SqliteSession = sessionmaker(bind=sqlite_engine)
PgSession = sessionmaker(bind=pg_engine)

sqlite_db = SqliteSession()
pg_db = PgSession()

inspector = inspect(sqlite_engine)
existing_tables = set(inspector.get_table_names())

total = 0
for model in TABLES_IN_ORDER:
    table_name = model.__tablename__
    if table_name not in existing_tables:
        continue
    rows = sqlite_db.query(model).all()
    for row in rows:
        data = {c.name: getattr(row, c.name) for c in model.__table__.columns}
        pg_db.merge(model(**data))
    pg_db.commit()
    print(f"{table_name}: {len(rows)} ligne(s) transférée(s)")
    total += len(rows)

sqlite_db.close()
pg_db.close()
print(f"\nTerminé — {total} lignes transférées au total.")
