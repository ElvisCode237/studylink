# Correction tutoriels YouTube et création de cours

Cette version corrige :

1. L'erreur PostgreSQL `inconsistent types deduced for parameter $13` lors de la création d'un cours.
2. Le même risque sur le statut lors de la modification d'un cours.
3. La création de tutoriels avec une vraie vidéo YouTube.
4. La lecture de la vidéo YouTube directement dans StudyLink.
5. L'ajout d'une vidéo YouTube à un tutoriel déjà existant.

## Ajouter un nouveau tutoriel vidéo

Admin > Tutoriels > Ajouter

- Titre
- Description
- Lien YouTube
- Niveau
- Langue
- Durée
- Statut `published` pour le rendre visible dans l'application

La première étape vidéo est créée automatiquement.

## Ajouter une vidéo à un tutoriel existant

Sur la carte du tutoriel, cliquer sur :

`Ajouter une vidéo YouTube`

Puis coller le lien complet YouTube.

## Lecture publique

La page publique utilise :

`/tutorials/:id`

Le backend public expose :

`GET /api/content/tutorials/:id`

La vidéo reste hébergée par YouTube et est lue dans un iframe intégré à StudyLink.
