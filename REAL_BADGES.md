# Compteurs réels de l'accueil

Les badges Accueil sont calculés pour l'utilisateur connecté :

- **Messages** : nombre de messages privés reçus et non lus (`messages.read_at IS NULL`).
- **Forum** : nombre de notifications forum non lues. Une réponse crée une notification pour l'auteur du sujet et les personnes qui suivent la discussion, sauf l'auteur de la réponse.
- **Notifications** : nombre d'alertes générales non lues, hors messages et forum, afin d'éviter les doublons. Les nouvelles réservations et annulations alimentent notamment ce compteur.

L'endpoint utilisé est :

`GET /api/content/dashboard-counts`

Les compteurs sont rechargés à l'ouverture de l'accueil, toutes les 20 secondes, au retour sur l'onglet et lorsque la fenêtre reprend le focus.

Le badge disparaît automatiquement lorsque le compteur vaut 0.
