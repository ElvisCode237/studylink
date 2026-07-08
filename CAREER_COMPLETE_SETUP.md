# Module Carrière complet

## Installation
1. Exécuter `backend/migrations/013_complete_career_module.sql` si ce n'est pas déjà fait.
2. Exécuter `backend/migrations/014_rich_career_content.sql`.
3. Vérifier la configuration Supabase Storage côté Render pour l'envoi des CV.
4. Redéployer Render puis Vercel.

## Fonctionnalités
- Simulation d'entretien avec chrono, réponse écrite et enregistrement audio local.
- Simulation RH.
- Banque de questions RH, comportementales et techniques.
- Envoi réel d'un CV vers Supabase Storage.
- Audit CV en 15 points avec score.
- Feedback et historique des entraînements.
- Ateliers guidés, modèles et ressources officielles.
