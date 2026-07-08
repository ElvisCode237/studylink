# Module Mon profil

La version actuelle ajoute un espace profil utilisateur complet :

- nom complet et profession ;
- biographie ;
- téléphone, ville et pays ;
- site web et centres d’intérêt ;
- photo de profil envoyée dans Supabase Storage ;
- langue, fuseau horaire et visibilité ;
- préférences de notifications ;
- changement d’adresse email avec confirmation du mot de passe actuel ;
- changement de mot de passe ;
- espace professionnel spécifique aux tuteurs ;
- gestion des disponibilités pour les tuteurs.

## Installation

Exécuter une seule fois dans Supabase SQL Editor :

`backend/migrations/008_user_profiles.sql`

Le bucket `studylink-content` et les variables Supabase du backend doivent déjà être configurés pour l’envoi des photos.
