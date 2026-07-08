# StudyLink — correction fonctionnelle complète

Cette version corrige les parties qui étaient encore synthétiques ou partagées entre tous les utilisateurs.

## Parcours désormais branchés à l'utilisateur connecté

- Les messages sont propres à chaque compte.
- Un utilisateur peut démarrer une conversation avec un autre utilisateur réel.
- Le bouton Contacter d'un tuteur ouvre une vraie conversation avec le compte utilisateur du tuteur.
- Les pièces jointes de messages sont envoyées vers Supabase Storage et liées à `message_attachments`.
- Les sessions affichées dans `Mes sessions` viennent de `bookings` et sont filtrées par l'utilisateur connecté.
- Le détail d'une session vient de la base de données.
- Les réservations utilisent les vrais créneaux `availability_slots` d'un tuteur.

## Contenus publics réellement connectés

- Catalogue : vrais cours publiés depuis `courses`.
- Documents : vrais fichiers de cours publiés depuis `course_files`.
- Tutoriels : vrais tutoriels publiés depuis `tutorials` et `tutorial_steps`.
- Forum : vraies catégories, discussions et réponses depuis `forum_*`.
- Bootcamps : vrais bootcamps publiés et inscriptions dans `bootcamp_registrations`.
- Développement personnel : vrais programmes et livres publiés.
- Entrepreneuriat : vrais outils publiés et tableau de bord projet propre à l'utilisateur.
- Notifications : notifications propres à l'utilisateur connecté.

## Points importants

Pour que les contenus soient visibles côté utilisateur, leur statut doit être `published`.
Après remplacement du projet, redéployez d'abord Render, puis Vercel.
