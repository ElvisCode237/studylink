# Correction des avatars dans les conversations

- La page Conversation récupère désormais le contact réel depuis `GET /api/messages/thread/:userId`.
- Le backend renvoie `contact.avatar_url`, `contact.full_name`, `contact.role`, `contact.occupation`, `contact.city` et `contact.country`.
- L'en-tête de conversation affiche la photo réelle du contact.
- Si aucune photo n'existe, StudyLink affiche l'initiale du nom au lieu d'une photo de démonstration fixe.
- Le changement de photo de profil est visible dans les conversations au prochain chargement.
