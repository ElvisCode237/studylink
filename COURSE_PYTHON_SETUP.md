# Installer le cours Python complet

Cette version ajoute une expérience de cours complète :

- 6 modules ;
- 18 leçons ;
- vidéos YouTube intégrées ;
- exercices et lectures ;
- ressources officielles Python ;
- inscription par utilisateur ;
- progression par leçon ;
- reprise du dernier cours ;
- notes privées par utilisateur.

## Option A — Supabase SQL Editor

1. Ouvrir `backend/migrations/006_complete_python_course.sql`.
2. Copier tout le fichier.
3. Supabase → SQL Editor → New query.
4. Coller puis cliquer sur **Run**.

## Option B — Exécuter depuis le backend

Avec `DATABASE_URL` configuré :

```bash
cd backend
npm install
npm run seed:python-course
```

Le script est idempotent : il peut être rejoué pour mettre à jour le cours sans créer de doublons.

## Sources externes utilisées

Les vidéos restent hébergées sur YouTube et sont intégrées dans StudyLink. Les ressources documentaires pointent vers la documentation officielle de Python. StudyLink n’héberge ni ne recopie ces contenus externes.
