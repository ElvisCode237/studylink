-- STUDYLINK - SUPPRESSION DES DONNEES DE DEMONSTRATION DE L'ESPACE D'ETUDE
-- Cette migration supprime uniquement les contenus exacts créés automatiquement par l'ancien seed.

DELETE FROM public.study_tasks
WHERE title IN (
  'Terminer la leçon 4 de Python',
  'Faire les exercices sur les boucles',
  'Réviser 20 mots allemands',
  'Lire 10 pages de Machine Learning'
);

DELETE FROM public.study_planner_events
WHERE (title, description) IN (
  ('Python débutants','Module 3 – Fonctions'),
  ('Projet StudyLink','Développement du MVP'),
  ('Mathématiques','Algèbre linéaire'),
  ('Allemand B1','Vocabulaire'),
  ('Lecture','Deep Work'),
  ('Machine Learning','Régression linéaire')
);

DELETE FROM public.study_notes
WHERE title IN (
  'Différence list / tuple',
  'Régression linéaire — résumé',
  'Vocabulaire B1 semaine 3',
  'Idées de projets ML'
);

DELETE FROM public.study_goals
WHERE title IN (
  'Apprendre Python',
  'Allemand B1',
  'Préparation entretien',
  'Machine Learning'
);

-- Vérification
SELECT
  (SELECT COUNT(*) FROM public.study_tasks) AS study_tasks,
  (SELECT COUNT(*) FROM public.study_planner_events) AS planner_events,
  (SELECT COUNT(*) FROM public.study_notes) AS study_notes,
  (SELECT COUNT(*) FROM public.study_goals) AS study_goals;
