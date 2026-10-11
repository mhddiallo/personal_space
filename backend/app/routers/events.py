import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=list[schemas.EventOut])
def list_events(
    start: datetime.date | None = None,
    end: datetime.date | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(models.Event).order_by(models.Event.date, models.Event.id)
    if start is not None:
        stmt = stmt.where(models.Event.date >= start)
    if end is not None:
        stmt = stmt.where(models.Event.date <= end)
    return db.scalars(stmt).all()


@router.post("", response_model=schemas.EventOut, status_code=201)
def create_event(payload: schemas.EventCreate, db: Session = Depends(get_db)):
    event = models.Event(**payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/{event_id}", response_model=schemas.EventOut)
def update_event(event_id: int, payload: schemas.EventUpdate, db: Session = Depends(get_db)):
    event = db.get(models.Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Événement introuvable")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: int, db: Session = Depends(get_db)):
    event = db.get(models.Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Événement introuvable")
    db.delete(event)
    db.commit()
