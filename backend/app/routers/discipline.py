import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/discipline", tags=["discipline"])


def _clean_weekdays(weekdays: list[int]) -> list[int]:
    if any(w < 0 or w > 6 for w in weekdays):
        raise HTTPException(status_code=400, detail="Jour invalide (0 = lundi ... 6 = dimanche)")
    return sorted(set(weekdays))


def _set_weekdays(rule: models.DisciplineRule, weekdays: list[int]) -> None:
    # On ne touche qu'aux jours qui changent : supprimer puis recréer les mêmes lignes
    # violerait la contrainte d'unicité (SQLAlchemy insère avant de supprimer).
    wanted = set(_clean_weekdays(weekdays))
    for row in list(rule.weekday_rows):
        if row.weekday in wanted:
            wanted.discard(row.weekday)
        else:
            rule.weekday_rows.remove(row)
    for w in sorted(wanted):
        rule.weekday_rows.append(models.RuleWeekday(weekday=w))


# ---------- Règles (bibliothèque + semaine type) ----------


@router.get("/rules", response_model=list[schemas.RuleOut])
def list_rules(db: Session = Depends(get_db)):
    stmt = select(models.DisciplineRule).order_by(
        models.DisciplineRule.position, models.DisciplineRule.id
    )
    return db.scalars(stmt).unique().all()


@router.post("/rules", response_model=schemas.RuleOut, status_code=201)
def create_rule(payload: schemas.RuleCreate, db: Session = Depends(get_db)):
    data = payload.model_dump(exclude={"weekdays"})
    rule = models.DisciplineRule(**data)
    last_position = db.scalar(select(func.max(models.DisciplineRule.position)))
    rule.position = (last_position or 0) + 1
    _set_weekdays(rule, payload.weekdays)
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.put("/rules/{rule_id}", response_model=schemas.RuleOut)
def update_rule(rule_id: int, payload: schemas.RuleUpdate, db: Session = Depends(get_db)):
    rule = db.get(models.DisciplineRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="Règle introuvable")
    data = payload.model_dump(exclude_unset=True, exclude={"weekdays"})
    for key, value in data.items():
        setattr(rule, key, value)
    if payload.weekdays is not None:
        _set_weekdays(rule, payload.weekdays)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}", status_code=204)
def delete_rule(rule_id: int, db: Session = Depends(get_db)):
    rule = db.get(models.DisciplineRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="Règle introuvable")
    db.delete(rule)
    db.commit()


# ---------- Exceptions par date (écarts par rapport à la semaine type) ----------


@router.get("/overrides", response_model=list[schemas.RuleOverrideOut])
def list_overrides(start: datetime.date, end: datetime.date, db: Session = Depends(get_db)):
    stmt = select(models.RuleOverride).where(
        models.RuleOverride.date >= start, models.RuleOverride.date <= end
    )
    return db.scalars(stmt).all()


@router.put("/overrides", response_model=schemas.RuleOverrideOut)
def set_override(payload: schemas.RuleOverrideSet, db: Session = Depends(get_db)):
    if db.get(models.DisciplineRule, payload.rule_id) is None:
        raise HTTPException(status_code=404, detail="Règle introuvable")
    stmt = select(models.RuleOverride).where(
        models.RuleOverride.rule_id == payload.rule_id, models.RuleOverride.date == payload.date
    )
    override = db.scalars(stmt).first()
    if override is None:
        override = models.RuleOverride(
            rule_id=payload.rule_id, date=payload.date, action=payload.action
        )
        db.add(override)
    else:
        override.action = payload.action
    db.commit()
    db.refresh(override)
    return override


@router.delete("/overrides", status_code=204)
def clear_overrides(
    date: datetime.date, rule_id: int | None = None, db: Session = Depends(get_db)
):
    """Supprime l'exception d'une règle pour une date, ou toutes celles de la date."""
    stmt = delete(models.RuleOverride).where(models.RuleOverride.date == date)
    if rule_id is not None:
        stmt = stmt.where(models.RuleOverride.rule_id == rule_id)
    db.execute(stmt)
    db.commit()


# ---------- Cases cochées ----------


@router.get("/checks", response_model=list[schemas.RuleCheckOut])
def list_checks(start: datetime.date, end: datetime.date, db: Session = Depends(get_db)):
    stmt = select(models.RuleCheck).where(
        models.RuleCheck.date >= start, models.RuleCheck.date <= end
    )
    return db.scalars(stmt).all()


@router.put("/checks", response_model=schemas.RuleCheckOut | None)
def set_check(payload: schemas.RuleCheckSet, db: Session = Depends(get_db)):
    if db.get(models.DisciplineRule, payload.rule_id) is None:
        raise HTTPException(status_code=404, detail="Règle introuvable")
    stmt = select(models.RuleCheck).where(
        models.RuleCheck.rule_id == payload.rule_id, models.RuleCheck.date == payload.date
    )
    check = db.scalars(stmt).first()
    if payload.done:
        if check is None:
            check = models.RuleCheck(rule_id=payload.rule_id, date=payload.date)
            db.add(check)
            db.commit()
            db.refresh(check)
        return check
    if check is not None:
        db.delete(check)
        db.commit()
    return None
