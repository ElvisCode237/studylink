# Correction des profils de tuteurs

## Problème corrigé
La liste publique recevait `tutor_id` depuis l'API, mais construisait les liens avec `t.id`. Les URLs devenaient `/tutors/undefined` et la page affichait ensuite le profil de démonstration Marc T.

## Correctifs
- Utilisation de `tutor_id` pour les liens publics.
- Aucune redirection vers `/tutors/undefined`.
- Chargement du profil réel depuis `GET /api/tutors/:id`.
- Suppression du fallback silencieux vers Marc T. en cas d'erreur.
- Affichage d'un vrai état d'erreur si le profil n'existe pas.
- Onglets À propos, Disponibilités et Avis alimentés par les données du tuteur sélectionné.
- Bouton Contacter relié au `user_id` réel du tuteur.
- Bouton Réserver relié au `tutor_id` réel.
