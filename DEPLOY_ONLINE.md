# Mise en ligne StudyLink

## Ce qui est pret

- Le backend peut servir l'API et le frontend compile depuis `frontend/dist`.
- `render.yaml` prepare un deploiement Render avec PostgreSQL.
- La version Windows peut etre reconstruite avec une URL API publique.

## Etapes pour une mise en ligne permanente

1. Mettre ce dossier dans un depot GitHub.
2. Dans Render, creer un Blueprint depuis ce depot avec `render.yaml`.
3. Appliquer les migrations SQL dans la base PostgreSQL Render.
4. Seed les donnees de demonstration si souhaite.
5. Mettre l'URL Render du backend dans `frontend/.env.production` :

```env
VITE_API_URL=https://votre-backend-render.onrender.com/api
```

6. Reconstruire la version Windows :

```bash
cd frontend
npm run build
npx electron-builder --win
```

## Limite du tunnel temporaire

LocalTunnel permet de partager vite une URL, mais ce n'est pas un backend permanent. Si le PC s'eteint, si la session s'arrete, ou si LocalTunnel coupe la connexion, l'application Windows ne pourra plus recuperer les donnees.
