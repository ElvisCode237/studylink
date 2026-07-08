-- STUDYLINK - CONTENU CARRIERE ENRICHI
-- Idempotent. Complète la migration 013.

ALTER TABLE career_practice_attempts ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE career_practice_attempts ADD COLUMN IF NOT EXISTS recording_url TEXT;

-- Questions supplémentaires
INSERT INTO career_interview_questions(category,question,guidance,difficulty,sort_order) VALUES
('hr','Pourquoi ce poste vous intéresse-t-il ?','Reliez les missions, vos compétences et votre prochaine étape professionnelle.','beginner',11),
('hr','Quelles sont vos attentes salariales ?','Préparez une fourchette cohérente avec le marché, le niveau et le package global.','intermediate',12),
('hr','Où vous voyez-vous dans cinq ans ?','Parlez de progression de compétences et de responsabilités, pas d’un titre rigide.','beginner',13),
('hr','Pourquoi quittez-vous votre poste actuel ?','Restez positif et expliquez ce que vous recherchez maintenant.','beginner',14),
('hr','Avez-vous des questions pour nous ?','Préparez des questions sur les priorités, l’équipe et les critères de réussite.','beginner',15),
('behavioral','Racontez une décision prise avec des informations incomplètes.','Expliquez vos hypothèses, le risque acceptable et votre point de contrôle.','advanced',11),
('behavioral','Comment gérez-vous le stress ?','Donnez des pratiques concrètes et un exemple réel.','beginner',12),
('behavioral','Parlez d’une collaboration difficile.','Montrez écoute, clarification des attentes et recherche d’un objectif commun.','intermediate',13),
('behavioral','Décrivez une situation où vous avez dû convaincre.','Expliquez votre préparation, l’objection principale et le résultat.','intermediate',14),
('behavioral','Racontez un projet qui n’a pas atteint son objectif initial.','Montrez ce que vous avez appris, corrigé et transmis à l’équipe.','advanced',15),
('technical','Comment choisissez-vous entre deux technologies ?','Comparez exigences, contraintes, maturité, coût total et risque.','advanced',11),
('technical','Comment déboguez-vous un incident en production ?','Stabiliser, observer, réduire le périmètre, corriger, vérifier, apprendre.','advanced',12),
('technical','Comment gérez-vous la dette technique ?','Rendez-la visible, reliez-la à l’impact métier et priorisez.','advanced',13),
('technical','Comment documentez-vous votre travail ?','Documentez les décisions, interfaces et procédures de reprise.','intermediate',14),
('technical','Comment estimez-vous une tâche technique ?','Découpez, rendez visibles les inconnues, dépendances et risques.','intermediate',15)
ON CONFLICT (category,question) DO NOTHING;

-- Ressources internes complètes
INSERT INTO career_resources(author_id,title,resource_type,description,url,is_free)
SELECT a.id,x.title,x.type,x.description,x.url,true
FROM (SELECT id FROM users WHERE role='admin' ORDER BY created_at LIMIT 1) a
CROSS JOIN (VALUES
('Méthode STAR : guide complet','article','Structurez vos réponses comportementales avec Situation, Tâche, Action et Résultat.','/career-prep?tool=star'),
('Construire un pitch de 2 minutes','video','Présentez votre profil, vos preuves et votre objectif avec une structure chronométrée.','/career-prep?tool=pitch'),
('Checklist 24 h avant l’entretien','checklist','Préparez le fond, la logistique, les documents et votre énergie.','/career-prep?tool=checklist'),
('CV : contrôle qualité en 15 points','cv_template','Auditez le contenu, la lisibilité, les résultats et l’adaptation au poste.','/career-prep?tool=cv'),
('25 questions à poser au recruteur','interview_questions','Préparez des questions intelligentes pour la fin de l’entretien.','/career-prep?tool=questions-to-ask'),
('Préparer un entretien technique','article','Cartographiez les compétences, pratiquez et expliquez votre raisonnement.','/career-prep?tool=technical'),
('Négocier son salaire','article','Préparez votre fourchette, vos preuves et le package global.','/career-prep?tool=salary'),
('Relance après entretien : 3 modèles','cover_letter','Messages de remerciement, relance et demande de feedback.','/career-prep?tool=follow-up')
) x(title,type,description,url)
WHERE a.id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM career_resources r WHERE r.title=x.title);
