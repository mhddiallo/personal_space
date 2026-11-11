# Étape 1 : compile le site React.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Même origine que l'API (Caddy proxifie /api) : pas de VITE_API_BASE à fournir.
RUN npm run build

# Étape 2 : Caddy sert le site et relaie /api vers le conteneur API, avec HTTPS automatique.
FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
