# StudyLink — Appels audio/vidéo réels

## 1. Migration Supabase obligatoire
Exécuter dans le SQL Editor Supabase :

`backend/migrations/007_calls_webrtc.sql`

Cette migration crée :
- `call_sessions`
- `call_signals`

## 2. Redéploiement
1. Redéployer le backend sur Render.
2. Redéployer le frontend sur Vercel.
3. Ouvrir StudyLink dans deux navigateurs ou deux appareils avec deux comptes différents.
4. Depuis une conversation, utiliser le bouton téléphone ou caméra.

## 3. Autorisations navigateur
Le navigateur doit autoriser :
- microphone
- caméra
- partage d'écran (uniquement lorsqu'il est demandé)

HTTPS est requis en production. Vercel utilise HTTPS.

## 4. TURN recommandé
Le projet fonctionne avec des serveurs STUN publics pour les cas simples. Pour une fiabilité élevée entre réseaux d'entreprise, réseaux mobiles ou NAT stricts, ajouter un serveur TURN dans Vercel :

- `VITE_TURN_URL`
- `VITE_TURN_USERNAME`
- `VITE_TURN_CREDENTIAL`

Sans TURN, certains couples de réseaux peuvent ne pas réussir à établir le flux pair-à-pair.
