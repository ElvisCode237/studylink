# Publication des cours et pièces jointes

## Cours
- Les cours en `draft` (Brouillon) ne sont pas publics.
- Dans Admin > Cours, cliquez sur **Publier**.
- Après publication, le cours apparaît automatiquement sur :
  - l'accueil,
  - le catalogue,
  - et ses fichiers dans Documents.

## Messagerie
La conversation accepte maintenant les pièces jointes : PDF, Office, ZIP, images, audio et vidéo.
Le fichier est stocké dans Supabase Storage puis référencé dans `message_attachments`.

## Migration supplémentaire
Exécutez une fois :
`backend/migrations/005_message_attachments.sql`

## Déploiement
1. Déployer Render (backend).
2. Déployer Vercel (frontend).
