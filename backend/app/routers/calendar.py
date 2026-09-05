from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


# ---------- Activities ----------


@router.get("/activities", response_model=list[schemas.ActivityOut])
def list_activities(db: Session = Depends(get_db)):
    return db.scalars(select(models.Activity).order_by(models.Activity.name)).all()


@router.post("/activities", response_model=schemas.ActivityOut, status_code=201)
def create_activity(payload: schemas.ActivityCreate, db: Session = Depends(get_db)):
    activity = models.Activity(**payload.model_dump())
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


@router.put("/activities/{activity_id}", response_model=schemas.ActivityOut)
def update_activity(activity_id: int, payload: schemas.ActivityUpdate, db: Session = Depends(get_db)):
    activity = db.get(models.Activity, activity_id)
    if activity is None:
        raise HTTPException(status_code=404, detail="Activité introuvable")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(activity, key, value)
    db.commit()
    db.refresh(activity)
    return activity


@router.delete("/activities/{activity_id}", status_code=204)
def delete_activity(activity_id: int, db: Session = Depends(get_db)):
    activity = db.get(models.Activity, activity_id)
    if activity is None:
        raise HTTPException(status_code=404, detail="Activité introuvable")
    db.delete(activity)
    db.commit()


# ---------- Hour cells (grille 168h) ----------


@router.get("/cells", response_model=list[schemas.HourCellOut])
def list_cells(db: Session = Depends(get_db)):
    return db.scalars(select(models.HourCell)).all()


@router.put("/cells", response_model=schemas.HourCellOut)
def set_cell(payload: schemas.HourCellSet, db: Session = Depends(get_db)):
    if not (0 <= payload.day_of_week <= 6) or not (0 <= payload.hour <= 23):
        raise HTTPException(status_code=400, detail="Jour ou heure invalide")
    activity = db.get(models.Activity, payload.activity_id)
    if activity is None:
        raise HTTPException(status_code=404, detail="Activité introuvable")

    stmt = select(models.HourCell).where(
        models.HourCell.day_of_week == payload.day_of_week,
        models.HourCell.hour == payload.hour,
    )
    cell = db.scalars(stmt).first()
    if cell is None:
        cell = models.HourCell(
            day_of_week=payload.day_of_week, hour=payload.hour, activity_id=payload.activity_id
        )
        db.add(cell)
    else:
        cell.activity_id = payload.activity_id
    db.commit()
    db.refresh(cell)
    return cell


@router.delete("/cells", status_code=204)
def clear_cell(day_of_week: int, hour: int, db: Session = Depends(get_db)):
    db.execute(
        delete(models.HourCell).where(
            models.HourCell.day_of_week == day_of_week, models.HourCell.hour == hour
        )
    )
    db.commit()
