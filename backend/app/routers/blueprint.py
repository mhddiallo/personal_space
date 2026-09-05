from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/blueprint", tags=["blueprint"])


# ---------- Items (timeline) ----------


@router.get("/items", response_model=list[schemas.BlueprintItemOut])
def list_items(day_type: models.DayType | None = None, db: Session = Depends(get_db)):
    stmt = select(models.BlueprintItem).order_by(models.BlueprintItem.start_minute)
    if day_type is not None:
        stmt = stmt.where(models.BlueprintItem.day_type == day_type)
    return db.scalars(stmt).all()


@router.post("/items", response_model=schemas.BlueprintItemOut, status_code=201)
def create_item(payload: schemas.BlueprintItemCreate, db: Session = Depends(get_db)):
    item = models.BlueprintItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/items/{item_id}", response_model=schemas.BlueprintItemOut)
def update_item(
    item_id: int, payload: schemas.BlueprintItemUpdate, db: Session = Depends(get_db)
):
    item = db.get(models.BlueprintItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Créneau introuvable")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(models.BlueprintItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Créneau introuvable")
    db.delete(item)
    db.commit()


# ---------- Habits ----------


@router.get("/habits", response_model=list[schemas.HabitOut])
def list_habits(db: Session = Depends(get_db)):
    return db.scalars(select(models.Habit).order_by(models.Habit.position)).all()


@router.post("/habits", response_model=schemas.HabitOut, status_code=201)
def create_habit(payload: schemas.HabitCreate, db: Session = Depends(get_db)):
    habit = models.Habit(**payload.model_dump())
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


@router.put("/habits/{habit_id}", response_model=schemas.HabitOut)
def update_habit(habit_id: int, payload: schemas.HabitUpdate, db: Session = Depends(get_db)):
    habit = db.get(models.Habit, habit_id)
    if habit is None:
        raise HTTPException(status_code=404, detail="Habitude introuvable")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(habit, key, value)
    db.commit()
    db.refresh(habit)
    return habit


@router.delete("/habits/{habit_id}", status_code=204)
def delete_habit(habit_id: int, db: Session = Depends(get_db)):
    habit = db.get(models.Habit, habit_id)
    if habit is None:
        raise HTTPException(status_code=404, detail="Habitude introuvable")
    db.delete(habit)
    db.commit()


# ---------- Principles ----------


@router.get("/principles", response_model=list[schemas.PrincipleOut])
def list_principles(db: Session = Depends(get_db)):
    return db.scalars(select(models.Principle).order_by(models.Principle.position)).all()


@router.post("/principles", response_model=schemas.PrincipleOut, status_code=201)
def create_principle(payload: schemas.PrincipleCreate, db: Session = Depends(get_db)):
    principle = models.Principle(**payload.model_dump())
    db.add(principle)
    db.commit()
    db.refresh(principle)
    return principle


@router.delete("/principles/{principle_id}", status_code=204)
def delete_principle(principle_id: int, db: Session = Depends(get_db)):
    principle = db.get(models.Principle, principle_id)
    if principle is None:
        raise HTTPException(status_code=404, detail="Principe introuvable")
    db.delete(principle)
    db.commit()
