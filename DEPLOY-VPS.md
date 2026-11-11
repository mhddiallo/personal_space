# Déploiement sur un VPS (Hostinger, Ubuntu)

Architecture : Caddy (HTTPS, site React, relais `/api`) + API FastAPI + Postgres. Tout tourne sur le VPS, rien d'autre à payer.

## 1. Première installation (une seule fois)

Connecte-toi au serveur (`ssh root@IP-DU-VPS`), puis :

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable

git clone https://github.com/mhddiallo/personal_space.git /opt/maison
cd /opt/maison
cp .env.example .env
nano .env        # AUTH_CODE, POSTGRES_PASSWORD (openssl rand -hex 24), SITE_ADDRESS, PUBLIC_URL
```

## 2. Récupérer tes données depuis Supabase

On démarre d'abord seulement la base du VPS, on y importe l'export, puis on lance tout.

```bash
cd /opt/maison
docker compose up -d db

# Colle l'URL de connexion Supabase (Session pooler, port 5432) puis Entrée.
# La saisie reste invisible et n'est pas gardée dans l'historique.
read -rs SUPA_URL

docker run --rm postgres:17-alpine pg_dump "$SUPA_URL" \
  --schema=public --no-owner --no-acl > /root/supabase-dump.sql
unset SUPA_URL

docker compose exec -T db psql -U maison -d maison < /root/supabase-dump.sql
docker compose up -d --build
```

Contrôle : `curl http://localhost/api/health` doit répondre `{"status":"ok"}`, puis connecte-toi et vérifie tes contacts, ta semaine, tes secteurs et tes prières.

Garde `/root/supabase-dump.sql` jusqu'à ce que tout soit vérifié. Ensuite tu peux supprimer ce fichier, puis le projet Supabase et les services Render.

## 3. Avec un nom de domaine

Chez ton registrar, crée un enregistrement DNS **A** vers l'IP du VPS. Dans `.env` :

```
SITE_ADDRESS=maison.exemple.com
PUBLIC_URL=https://maison.exemple.com
```

puis `docker compose up -d`. Caddy obtient le certificat tout seul.

## 4. Sauvegarde automatique

```bash
chmod +x /opt/maison/deploy/backup.sh
( crontab -l 2>/dev/null; echo "30 3 * * * /opt/maison/deploy/backup.sh" ) | crontab -
```

Chaque nuit à 3 h 30, un fichier est créé dans `/opt/maison-backups` (14 jours conservés). Pour restaurer : `gunzip -c fichier.sql.gz | docker compose exec -T db psql -U maison -d maison`.
Le VPS Hostinger propose aussi des sauvegardes du serveur entier dans son panneau, utiles en plus.

## 5. Mettre à jour après un changement

```bash
cd /opt/maison && git pull && docker compose up -d --build
```

## 6. Commandes utiles

- Logs : `docker compose logs -f api`
- Redémarrer : `docker compose restart`
- Les sessions de connexion sont en mémoire : un redémarrage te redemande le code.
