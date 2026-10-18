from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/api", tags=["sectors"])

MAX_FOCUS = schemas.MAX_FOCUS_PER_SECTOR


def _next_item_position(db: Session, sector_id: int) -> int:
    last = db.scalar(
        select(func.max(models.SectorItem.position)).where(models.SectorItem.sector_id == sector_id)
    )
    return (last or 0) + 1


def _focus_count(db: Session, sector_id: int, exclude_item_id: int | None = None) -> int:
    stmt = select(func.count(models.SectorItem.id)).where(
        models.SectorItem.sector_id == sector_id, models.SectorItem.focus.is_(True)
    )
    if exclude_item_id is not None:
        stmt = stmt.where(models.SectorItem.id != exclude_item_id)
    return db.scalar(stmt) or 0


def _check_focus_allowed(db: Session, sector_id: int, exclude_item_id: int | None = None) -> None:
    if _focus_count(db, sector_id, exclude_item_id) >= MAX_FOCUS:
        raise HTTPException(
            status_code=400, detail=f"{MAX_FOCUS} priorités maximum par secteur"
        )


# ---------- Secteurs ----------


@router.get("/sectors", response_model=list[schemas.SectorOut])
def list_sectors(db: Session = Depends(get_db)):
    stmt = select(models.Sector).order_by(models.Sector.position, models.Sector.id)
    return db.scalars(stmt).unique().all()


@router.post("/sectors", response_model=schemas.SectorOut, status_code=201)
def create_sector(payload: schemas.SectorCreate, db: Session = Depends(get_db)):
    last = db.scalar(select(func.max(models.Sector.position)))
    sector = models.Sector(**payload.model_dump(), position=(last or 0) + 1)
    db.add(sector)
    db.commit()
    db.refresh(sector)
    return sector


@router.post("/sectors/bulk")
def import_sectors(payload: schemas.SectorBulk, db: Session = Depends(get_db)):
    """Import d'un jeu de secteurs avec leurs éléments. Un secteur déjà présent (même nom) est ignoré."""
    existing_names = {name for (name,) in db.execute(select(models.Sector.name))}
    last = db.scalar(select(func.max(models.Sector.position))) or 0
    created_sectors = 0
    created_items = 0
    for data in payload.sectors:
        if data.name in existing_names:
            continue
        last += 1
        sector = models.Sector(
            name=data.name, description=data.description, color=data.color, position=last
        )
        for index, item in enumerate(data.items, start=1):
            focus = item.focus and sum(1 for x in sector.items if x.focus) < MAX_FOCUS
            sector.items.append(
                models.SectorItem(
                    title=item.title,
                    kind=item.kind,
                    done=item.done,
                    focus=focus,
                    active=item.active,
                    position=index,
                )
            )
            created_items += 1
        db.add(sector)
        created_sectors += 1
    db.commit()
    return {"sectors_created": created_sectors, "items_created": created_items}


@router.put("/sectors/{sector_id}", response_model=schemas.SectorOut)
def update_sector(sector_id: int, payload: schemas.SectorUpdate, db: Session = Depends(get_db)):
    sector = db.get(models.Sector, sector_id)
    if sector is None:
        raise HTTPException(status_code=404, detail="Secteur introuvable")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(sector, key, value)
    db.commit()
    db.refresh(sector)
    return sector


@router.delete("/sectors/{sector_id}", status_code=204)
def delete_sector(sector_id: int, db: Session = Depends(get_db)):
    sector = db.get(models.Sector, sector_id)
    if sector is None:
        raise HTTPException(status_code=404, detail="Secteur introuvable")
    db.delete(sector)
    db.commit()


# ---------- Éléments d'un secteur ----------


@router.post("/sectors/{sector_id}/items", response_model=schemas.SectorItemOut, status_code=201)
def create_item(sector_id: int, payload: schemas.SectorItemCreate, db: Session = Depends(get_db)):
    if db.get(models.Sector, sector_id) is None:
        raise HTTPException(status_code=404, detail="Secteur introuvable")
    if payload.focus:
        _check_focus_allowed(db, sector_id)
    item = models.SectorItem(
        sector_id=sector_id, position=_next_item_position(db, sector_id), **payload.model_dump()
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/sector-items/{item_id}", response_model=schemas.SectorItemOut)
def update_item(item_id: int, payload: schemas.SectorItemUpdate, db: Session = Depends(get_db)):
    item = db.get(models.SectorItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Élément introuvable")
    data = payload.model_dump(exclude_unset=True)

    target_sector_id = data.get("sector_id", item.sector_id)
    if target_sector_id != item.sector_id:
        if db.get(models.Sector, target_sector_id) is None:
            raise HTTPException(status_code=404, detail="Secteur introuvable")
        item.position = _next_item_position(db, target_sector_id)

    will_be_focus = data.get("focus", item.focus)
    became_focus = will_be_focus and (not item.focus or target_sector_id != item.sector_id)
    if became_focus:
        _check_focus_allowed(db, target_sector_id, exclude_item_id=item.id)

    for key, value in data.items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/sector-items/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(models.SectorItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Élément introuvable")
    db.delete(item)
    db.commit()


# ---------- Boîte d'entrée ----------


@router.get("/inbox", response_model=list[schemas.InboxOut])
def list_inbox(db: Session = Depends(get_db)):
    return db.scalars(select(models.InboxItem).order_by(models.InboxItem.id)).all()


@router.post("/inbox", response_model=schemas.InboxOut, status_code=201)
def create_inbox_item(payload: schemas.InboxCreate, db: Session = Depends(get_db)):
    item = models.InboxItem(title=payload.title.strip())
    if not item.title:
        raise HTTPException(status_code=400, detail="Texte vide")
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/inbox/{item_id}", status_code=204)
def delete_inbox_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(models.InboxItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Élément introuvable")
    db.delete(item)
    db.commit()


@router.post("/inbox/{item_id}/move", response_model=schemas.SectorItemOut)
def move_inbox_item(item_id: int, payload: schemas.InboxMove, db: Session = Depends(get_db)):
    inbox_item = db.get(models.InboxItem, item_id)
    if inbox_item is None:
        raise HTTPException(status_code=404, detail="Élément introuvable")
    if db.get(models.Sector, payload.sector_id) is None:
        raise HTTPException(status_code=404, detail="Secteur introuvable")
    item = models.SectorItem(
        sector_id=payload.sector_id,
        title=inbox_item.title,
        position=_next_item_position(db, payload.sector_id),
    )
    db.add(item)
    db.delete(inbox_item)
    db.commit()
    db.refresh(item)
    return item
