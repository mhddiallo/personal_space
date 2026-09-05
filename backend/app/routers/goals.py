from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/goals", tags=["goals"])


@router.get("", response_model=list[schemas.GoalOut])
def list_goals(db: Session = Depends(get_db)):
    stmt = select(models.Goal).order_by(models.Goal.created_at)
    return db.scalars(stmt).unique().all()


@router.post("", response_model=schemas.GoalOut, status_code=201)
def create_goal(payload: schemas.GoalCreate, db: Session = Depends(get_db)):
    data = payload.model_dump(exclude={"key_results"})
    goal = models.Goal(**data)
    for idx, kr in enumerate(payload.key_results):
        goal.key_results.append(models.KeyResult(label=kr.label, done=kr.done, position=idx))
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.put("/{goal_id}", response_model=schemas.GoalOut)
def update_goal(goal_id: int, payload: schemas.GoalUpdate, db: Session = Depends(get_db)):
    goal = db.get(models.Goal, goal_id)
    if goal is None:
        raise HTTPException(status_code=404, detail="Objectif introuvable")
    data = payload.model_dump(exclude_unset=True, exclude={"key_results"})
    for key, value in data.items():
        setattr(goal, key, value)
    if payload.key_results is not None:
        goal.key_results.clear()
        db.flush()
        for idx, kr in enumerate(payload.key_results):
            goal.key_results.append(models.KeyResult(label=kr.label, done=kr.done, position=idx))
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=204)
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    goal = db.get(models.Goal, goal_id)
    if goal is None:
        raise HTTPException(status_code=404, detail="Objectif introuvable")
    db.delete(goal)
    db.commit()


@router.put("/{goal_id}/key-results/{key_result_id}", response_model=schemas.KeyResultOut)
def update_key_result(
    goal_id: int,
    key_result_id: int,
    payload: schemas.KeyResultUpdate,
    db: Session = Depends(get_db),
):
    kr = db.get(models.KeyResult, key_result_id)
    if kr is None or kr.goal_id != goal_id:
        raise HTTPException(status_code=404, detail="Résultat clé introuvable")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(kr, key, value)
    db.commit()
    db.refresh(kr)
    return kr
