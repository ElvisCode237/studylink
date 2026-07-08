# Correction WebRTC StudyLink

Cette version corrige les problèmes de flux distant audio/vidéo.

Principales corrections :
- mise en file des candidats ICE reçus avant la description distante ;
- traitement séquentiel des signaux offer/answer/ice ;
- MediaStream distant explicite ;
- lecteur audio dédié pour les appels audio ;
- tentative explicite de lecture du média distant ;
- bouton « Activer le son et la vidéo » si l'autoplay du navigateur est bloqué ;
- polling de signalisation plus rapide ;
- états ICE visibles pour le diagnostic ;
- prise en charge TURN via VITE_TURN_URL, VITE_TURN_USERNAME et VITE_TURN_CREDENTIAL.

## Test
Utiliser deux comptes différents dans deux navigateurs distincts. Autoriser caméra et micro des deux côtés.

Si l'état reste `ICE: failed` entre deux réseaux différents, un serveur TURN est nécessaire.
