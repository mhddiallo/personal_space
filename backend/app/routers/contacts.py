from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.models import utcnow
from app.storage import delete_photo, save_photo

router = APIRouter(prefix="/api/contacts", tags=["contacts"])

ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def _sync_family_members(
    db: Session, contact: models.Contact, family_members: list[schemas.FamilyMemberCreate]
):
    contact.family_members.clear()
    db.flush()
    for member in family_members:
        contact.family_members.append(
            models.FamilyMember(
                name=member.name, relation_to_contact=member.relation_to_contact
            )
        )


@router.get("", response_model=list[schemas.ContactOut])
def list_contacts(db: Session = Depends(get_db)):
    stmt = select(models.Contact).order_by(models.Contact.first_name)
    return db.scalars(stmt).unique().all()


@router.post("", response_model=schemas.ContactOut, status_code=201)
def create_contact(payload: schemas.ContactCreate, db: Session = Depends(get_db)):
    data = payload.model_dump(exclude={"family_members"})
    contact = models.Contact(**data)
    now = utcnow()
    contact.contact_day = now.day
    contact.contact_month = now.month
    for member in payload.family_members:
        contact.family_members.append(
            models.FamilyMember(
                name=member.name, relation_to_contact=member.relation_to_contact
            )
        )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


# ---------- Rappels (contact récurrent tous les 4 mois) ----------
# Déclarée avant /{contact_id} pour que "mark-contacted" ne soit pas confondu
# avec un contact_id sur les routes qui suivent — ici ce n'est pas nécessaire
# puisque le préfixe /{contact_id}/mark-contacted place déjà l'id en premier.


@router.post("/{contact_id}/mark-contacted", response_model=schemas.ContactOut)
def mark_contacted(contact_id: int, db: Session = Depends(get_db)):
    contact = db.get(models.Contact, contact_id)
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact introuvable")
    contact.last_contacted_at = utcnow()
    db.commit()
    db.refresh(contact)
    return contact


@router.get("/{contact_id}", response_model=schemas.ContactOut)
def get_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = db.get(models.Contact, contact_id)
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact introuvable")
    return contact


@router.put("/{contact_id}", response_model=schemas.ContactOut)
def update_contact(
    contact_id: int, payload: schemas.ContactUpdate, db: Session = Depends(get_db)
):
    contact = db.get(models.Contact, contact_id)
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact introuvable")
    data = payload.model_dump(exclude_unset=True, exclude={"family_members"})
    for key, value in data.items():
        setattr(contact, key, value)
    if payload.family_members is not None:
        _sync_family_members(db, contact, payload.family_members)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = db.get(models.Contact, contact_id)
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact introuvable")
    delete_photo(contact.photo_path)
    db.delete(contact)
    db.commit()


@router.post("/{contact_id}/photo", response_model=schemas.ContactOut)
async def upload_photo(
    contact_id: int, file: UploadFile, db: Session = Depends(get_db)
):
    contact = db.get(models.Contact, contact_id)
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact introuvable")
    if file.content_type not in ALLOWED_PHOTO_TYPES:
        raise HTTPException(status_code=400, detail="Format d'image non supporté")

    contents = await file.read()
    old_photo_path = contact.photo_path
    contact.photo_path = save_photo(file.filename, contents, file.content_type)
    if old_photo_path:
        delete_photo(old_photo_path)

    db.commit()
    db.refresh(contact)
    return contact
