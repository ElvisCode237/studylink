# StudyLink Windows Release

StudyLink dispose maintenant d'une version Windows basee sur Electron.

## Lancer en developpement

Depuis `frontend` :

```bash
npm run desktop:dev
```

## Creer un executable Windows

Depuis `frontend` :

```bash
npm run desktop:build
```

Les fichiers seront generes dans :

```text
frontend/release/
```

La configuration produit :

- un installateur NSIS ;
- une version portable `.exe`.

## Backend

En developpement, l'application utilise :

```text
VITE_API_URL=http://localhost:4000/api
```

Pour distribuer l'application a d'autres personnes, deploie d'abord le backend en HTTPS public, puis cree `frontend/.env.production` avec :

```env
VITE_API_URL=https://votre-backend-public.example.com/api
```

Ensuite relance :

```bash
npm run desktop:build
```
