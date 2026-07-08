# Activation des uploads Admin — StudyLink

Cette version permet à l’administrateur de sélectionner des fichiers depuis son ordinateur.
Les fichiers sont envoyés au bucket public Supabase Storage `studylink-content`, puis leurs URL sont enregistrées dans PostgreSQL.

## 1. Exécuter la migration SQL

Dans Supabase > SQL Editor, exécuter :

`backend/migrations/004_admin_storage_uploads.sql`

Cette migration :
- crée / configure le bucket `studylink-content` ;
- crée la table `course_files`.

## 2. Ajouter les variables sur Render

Dans Render > Backend > Environment :

- `SUPABASE_URL=https://VOTRE-PROJET.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY=VOTRE_CLE_SERVICE_ROLE`
- `SUPABASE_CONTENT_BUCKET=studylink-content`

La clé `SUPABASE_SERVICE_ROLE_KEY` doit rester uniquement dans Render. Ne jamais la mettre dans Vercel ni dans le frontend.

## 3. Redéployer le backend Render

Le backend reçoit les fichiers en multipart/form-data, les envoie vers Supabase Storage, puis renvoie l’URL publique au frontend.

## 4. Redéployer le frontend Vercel

Les pages Admin suivantes utilisent maintenant un sélecteur de fichier :
- Cours : couverture + fichier principal ;
- Structure d’un cours : PDF, audio ou vidéo pour une leçon ;
- Livres : couverture + PDF/ePub/audio ;
- Tutoriels : couverture ;
- Bootcamps : couverture ;
- Développement personnel : couverture ;
- Entrepreneuriat : couverture + document/modèle.

Limite actuelle par fichier : 50 Mo.
