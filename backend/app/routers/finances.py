from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/finances", tags=["finances"])


# ---------- Transactions ----------


@router.get("/transactions", response_model=list[schemas.TransactionOut])
def list_transactions(db: Session = Depends(get_db)):
    stmt = select(models.Transaction).order_by(models.Transaction.date.desc())
    return db.scalars(stmt).all()


@router.post("/transactions", response_model=schemas.TransactionOut, status_code=201)
def create_transaction(payload: schemas.TransactionCreate, db: Session = Depends(get_db)):
    transaction = models.Transaction(**payload.model_dump())
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.put("/transactions/{transaction_id}", response_model=schemas.TransactionOut)
def update_transaction(
    transaction_id: int, payload: schemas.TransactionUpdate, db: Session = Depends(get_db)
):
    transaction = db.get(models.Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(status_code=404, detail="Transaction introuvable")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(transaction, key, value)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/transactions/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    transaction = db.get(models.Transaction, transaction_id)
    if transaction is None:
        raise HTTPException(status_code=404, detail="Transaction introuvable")
    db.delete(transaction)
    db.commit()


# ---------- Financial goals ----------


@router.get("/goals", response_model=list[schemas.FinancialGoalOut])
def list_financial_goals(db: Session = Depends(get_db)):
    return db.scalars(select(models.FinancialGoal)).all()


@router.post("/goals", response_model=schemas.FinancialGoalOut, status_code=201)
def create_financial_goal(payload: schemas.FinancialGoalCreate, db: Session = Depends(get_db)):
    goal = models.FinancialGoal(**payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.put("/goals/{goal_id}", response_model=schemas.FinancialGoalOut)
def update_financial_goal(
    goal_id: int, payload: schemas.FinancialGoalUpdate, db: Session = Depends(get_db)
):
    goal = db.get(models.FinancialGoal, goal_id)
    if goal is None:
        raise HTTPException(status_code=404, detail="Objectif introuvable")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(goal, key, value)
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/goals/{goal_id}", status_code=204)
def delete_financial_goal(goal_id: int, db: Session = Depends(get_db)):
    goal = db.get(models.FinancialGoal, goal_id)
    if goal is None:
        raise HTTPException(status_code=404, detail="Objectif introuvable")
    db.delete(goal)
    db.commit()
