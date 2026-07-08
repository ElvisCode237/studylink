# Configuration TURN pour les appels StudyLink

StudyLink récupère maintenant les serveurs ICE/TURN depuis le backend. Les secrets restent dans Render et ne sont jamais exposés durablement dans le frontend.

## Option recommandée: Twilio Network Traversal Service

Dans Render > Backend > Environment, ajoutez:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_TURN_TTL=3600`

Puis redéployez Render. Le frontend appelle automatiquement `GET /api/calls/ice-config` et reçoit des identifiants TURN temporaires.

## Alternative: TURN statique

Dans Render:

- `TURN_URL` (plusieurs URLs séparées par des virgules)
- `TURN_USERNAME`
- `TURN_CREDENTIAL`

Exemple:

`TURN_URL=turn:turn.example.com:3478?transport=udp,turn:turn.example.com:3478?transport=tcp,turns:turn.example.com:5349?transport=tcp`

## Vérification

Connectez deux comptes différents depuis deux navigateurs ou réseaux différents. Dans l'écran d'appel, le diagnostic doit afficher `TURN sécurisé chargé`, puis `ICE: connected` ou `ICE: completed`.
