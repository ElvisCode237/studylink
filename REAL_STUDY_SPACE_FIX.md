# Espace d'étude — données réelles uniquement

Cette version supprime les données de démonstration automatiques du module privé Espace d'étude.

## Changements

- aucun seed automatique de tâches, planning, notes ou objectifs ;
- aucun faux tuteur ou faux rendez-vous ;
- aucune progression fixe ;
- aucun faux document ;
- aucune statistique inventée ;
- les pages vides affichent des états utiles avec boutons d'action ;
- les données sont toujours filtrées par l'utilisateur authentifié ;
- les erreurs API sont affichées clairement avec un bouton Réessayer ;
- un cache local ne conserve que la dernière vraie réponse de l'API.

## Migration nécessaire

Exécuter une seule fois :

`backend/migrations/016_remove_study_space_demo_data.sql`

Cette migration supprime uniquement les contenus exacts créés par l'ancien seed automatique.
