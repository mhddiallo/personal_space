#!/bin/sh
# Sauvegarde quotidienne de la base : un fichier .sql.gz par jour, gardé 14 jours.
set -eu

DIR=/opt/maison
DEST=/opt/maison-backups
mkdir -p "$DEST"

cd "$DIR"
docker compose exec -T db pg_dump -U maison -d maison --no-owner \
  | gzip > "$DEST/maison-$(date +%F).sql.gz"

find "$DEST" -name 'maison-*.sql.gz' -mtime +14 -delete
