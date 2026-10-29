from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/api/duas", tags=["duas"])


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


@router.get("", response_model=list[schemas.DuaOut])
def list_duas(db: Session = Depends(get_db)):
    stmt = select(models.Dua).order_by(models.Dua.position, models.Dua.id)
    return db.scalars(stmt).all()


@router.post("", response_model=schemas.DuaOut, status_code=201)
def create_dua(payload: schemas.DuaCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    data["title"] = data["title"].strip()
    data["arabic"] = data["arabic"].strip()
    if not data["title"] or not data["arabic"]:
        raise HTTPException(status_code=400, detail="Titre et texte arabe obligatoires")
    for key in ("transliteration", "translation", "source", "repetitions"):
        data[key] = _clean(data[key])
    last = db.scalar(select(func.max(models.Dua.position)))
    dua = models.Dua(**data, position=(last or 0) + 1)
    db.add(dua)
    db.commit()
    db.refresh(dua)
    return dua


# Déclarée avant /{dua_id} pour que "reorder" ne soit jamais lu comme un identifiant.
@router.post("/reorder", response_model=list[schemas.DuaOut])
def reorder_duas(payload: schemas.DuaReorder, db: Session = Depends(get_db)):
    duas = db.scalars(select(models.Dua).order_by(models.Dua.position, models.Dua.id)).all()
    by_id = {d.id: d for d in duas}
    if len(set(payload.ids)) != len(payload.ids) or any(i not in by_id for i in payload.ids):
        raise HTTPException(status_code=400, detail="Liste d'identifiants invalide")
    ordered = [by_id[i] for i in payload.ids] + [d for d in duas if d.id not in set(payload.ids)]
    for position, dua in enumerate(ordered, start=1):
        dua.position = position
    db.commit()
    return ordered


@router.put("/{dua_id}", response_model=schemas.DuaOut)
def update_dua(dua_id: int, payload: schemas.DuaUpdate, db: Session = Depends(get_db)):
    dua = db.get(models.Dua, dua_id)
    if dua is None:
        raise HTTPException(status_code=404, detail="Dua introuvable")
    data = payload.model_dump(exclude_unset=True)
    for key in ("title", "arabic"):
        if key in data:
            data[key] = data[key].strip()
            if not data[key]:
                raise HTTPException(status_code=400, detail="Titre et texte arabe obligatoires")
    for key in ("transliteration", "translation", "source", "repetitions"):
        if key in data:
            data[key] = _clean(data[key])
    for key, value in data.items():
        setattr(dua, key, value)
    db.commit()
    db.refresh(dua)
    return dua


@router.delete("/{dua_id}", status_code=204)
def delete_dua(dua_id: int, db: Session = Depends(get_db)):
    dua = db.get(models.Dua, dua_id)
    if dua is None:
        raise HTTPException(status_code=404, detail="Dua introuvable")
    db.delete(dua)
    db.commit()
