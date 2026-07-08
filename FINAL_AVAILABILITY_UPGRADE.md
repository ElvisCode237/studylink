# StudyLink — Recherche de tuteurs & disponibilités v4

Cette version ajoute :
- recherche réelle par nom, compétence et matière ;
- filtres matière, tarif maximum et disponibilité à une date ;
- calendrier visible sur 7 jours pour chaque tuteur ;
- couleurs : vert = disponible, bleu = réservé, rouge = occupé ;
- réservation directe depuis la liste ;
- verrouillage transactionnel déjà présent côté backend ;
- affichage du profil réel et du tarif réel ;
- migration `009_availability_experience.sql` pour les index et pour initialiser de vrais créneaux aux tuteurs qui n'en ont aucun.

## Installation
1. Déployer le nouveau backend sur Render.
2. Déployer le nouveau frontend sur Vercel.
3. Dans Supabase SQL Editor, exécuter `backend/migrations/009_availability_experience.sql` une seule fois.

La migration est idempotente : elle ne remplit que les tuteurs qui n'ont aucun créneau futur.
