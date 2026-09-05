from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/food", tags=["food"])


# ---------- Food items ----------


@router.get("/items", response_model=list[schemas.FoodItemOut])
def list_items(db: Session = Depends(get_db)):
    return db.scalars(select(models.FoodItem).order_by(models.FoodItem.name)).all()


@router.post("/items", response_model=schemas.FoodItemOut, status_code=201)
def create_item(payload: schemas.FoodItemCreate, db: Session = Depends(get_db)):
    item = models.FoodItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/items/{item_id}", response_model=schemas.FoodItemOut)
def update_item(item_id: int, payload: schemas.FoodItemUpdate, db: Session = Depends(get_db)):
    item = db.get(models.FoodItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Aliment introuvable")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(models.FoodItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Aliment introuvable")
    db.delete(item)
    db.commit()


# ---------- Meal slots (tableau de la semaine) ----------


@router.get("/slots", response_model=list[schemas.MealSlotOut])
def list_slots(db: Session = Depends(get_db)):
    return db.scalars(select(models.MealSlot)).all()


@router.put("/slots", response_model=schemas.MealSlotOut)
def set_slot(payload: schemas.MealSlotSet, db: Session = Depends(get_db)):
    if not (0 <= payload.day_of_week <= 6):
        raise HTTPException(status_code=400, detail="Jour invalide")
    food_item = db.get(models.FoodItem, payload.food_item_id)
    if food_item is None:
        raise HTTPException(status_code=404, detail="Aliment introuvable")

    stmt = select(models.MealSlot).where(
        models.MealSlot.day_of_week == payload.day_of_week,
        models.MealSlot.meal_type == payload.meal_type,
    )
    slot = db.scalars(stmt).first()
    if slot is None:
        slot = models.MealSlot(
            day_of_week=payload.day_of_week,
            meal_type=payload.meal_type,
            food_item_id=payload.food_item_id,
        )
        db.add(slot)
    else:
        slot.food_item_id = payload.food_item_id
    db.commit()
    db.refresh(slot)
    return slot


@router.delete("/slots", status_code=204)
def clear_slot(day_of_week: int, meal_type: models.MealType, db: Session = Depends(get_db)):
    db.execute(
        delete(models.MealSlot).where(
            models.MealSlot.day_of_week == day_of_week, models.MealSlot.meal_type == meal_type
        )
    )
    db.commit()
