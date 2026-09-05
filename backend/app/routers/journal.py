from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/journal", tags=["journal"])


@router.get("", response_model=list[schemas.JournalEntryOut])
def list_entries(db: Session = Depends(get_db)):
    stmt = select(models.JournalEntry).order_by(models.JournalEntry.entry_date.desc())
    return db.scalars(stmt).all()


@router.post("", response_model=schemas.JournalEntryOut, status_code=201)
def create_entry(payload: schemas.JournalEntryCreate, db: Session = Depends(get_db)):
    entry = models.JournalEntry(**payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/{entry_id}", response_model=schemas.JournalEntryOut)
def get_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.get(models.JournalEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Entrée introuvable")
    return entry


@router.put("/{entry_id}", response_model=schemas.JournalEntryOut)
def update_entry(
    entry_id: int, payload: schemas.JournalEntryUpdate, db: Session = Depends(get_db)
):
    entry = db.get(models.JournalEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Entrée introuvable")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(entry, key, value)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=204)
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.get(models.JournalEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Entrée introuvable")
    db.delete(entry)
    db.commit()
