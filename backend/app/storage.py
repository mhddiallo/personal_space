"""Stockage des photos de contacts.

En local (aucune variable Supabase définie) : fichiers sur disque, servis via
le mount /uploads de FastAPI, comme avant.

En production (SUPABASE_URL + SUPABASE_SERVICE_KEY définies) : les photos
partent dans un bucket public Supabase Storage, ce qui rend le backend
totalement sans état (déployable sans disque persistant).
"""

import os
import uuid
from pathlib import Path

import httpx

from app.database import PHOTOS_DIR

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
SUPABASE_BUCKET = os.environ.get("SUPABASE_PHOTOS_BUCKET", "contact-photos")

USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)


def _supabase_headers(content_type: str | None = None) -> dict:
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "apikey": SUPABASE_SERVICE_KEY,
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def save_photo(filename_hint: str, contents: bytes, content_type: str) -> str:
    """Enregistre la photo et retourne le chemin/URL à stocker sur le contact."""
    extension = Path(filename_hint or "").suffix or ".jpg"
    filename = f"{uuid.uuid4().hex}{extension}"

    if USE_SUPABASE:
        url = f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{filename}"
        resp = httpx.post(url, headers=_supabase_headers(content_type), content=contents, timeout=30)
        resp.raise_for_status()
        return f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{filename}"

    PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
    destination = PHOTOS_DIR / filename
    destination.write_bytes(contents)
    return f"/uploads/photos/{filename}"


def delete_photo(photo_path: str | None) -> None:
    if not photo_path:
        return

    if USE_SUPABASE and photo_path.startswith(SUPABASE_URL):
        filename = photo_path.rsplit("/", 1)[-1]
        url = f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{filename}"
        try:
            httpx.delete(url, headers=_supabase_headers(), timeout=30)
        except httpx.HTTPError:
            pass
        return

    local_file = PHOTOS_DIR / Path(photo_path).name
    local_file.unlink(missing_ok=True)
