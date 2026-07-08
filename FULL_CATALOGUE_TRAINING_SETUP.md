# StudyLink — Catalogue complet de formations

Cette version transforme les 32 cours du catalogue en parcours suivables de bout en bout.

## Installation la plus simple

1. Redéployer le backend Render avec cette version.
2. Se connecter avec un compte administrateur.
3. Ouvrir `Administration > Cours`.
4. Cliquer sur `Installer les 32 formations complètes`.
5. Attendre le message de confirmation.
6. Redéployer le frontend Vercel.

Le bouton exécute automatiquement les migrations :
- `010_full_catalogue_content.sql`
- `011_complete_all_catalogue_courses.sql`

## Résultat

- 32 cours publiés
- 5 modules par cours
- 20 leçons par cours
- environ 640 leçons au total
- lectures guidées
- exercices pratiques
- quiz d'auto-évaluation
- études de cas
- projets finaux
- progression propre à chaque utilisateur
- notes privées par leçon
- reprise automatique
- certificat final après 100 % de progression

## Alternative SQL

Dans Supabase SQL Editor, exécuter dans l'ordre :
1. `010_full_catalogue_content.sql`
2. `011_complete_all_catalogue_courses.sql`

## Certificat

Quand toutes les leçons d'un cours sont terminées, l'utilisateur peut ouvrir :
`/courses/<id-ou-slug>/certificate`

Le backend vérifie réellement la progression avant de générer le certificat.
