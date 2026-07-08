-- STUDYLINK - MODULE CARRIERE COMPLET
-- Idempotent et compatible avec les versions précédentes.

CREATE TABLE IF NOT EXISTS career_interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(40) NOT NULL,
  question TEXT NOT NULL,
  guidance TEXT,
  difficulty VARCHAR(20) NOT NULL DEFAULT 'beginner',
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category, question)
);

CREATE TABLE IF NOT EXISTS career_practice_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES career_interview_questions(id) ON DELETE SET NULL,
  answer_text TEXT,
  confidence INTEGER NOT NULL DEFAULT 3 CHECK (confidence BETWEEN 1 AND 5),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS career_cv_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  mime_type VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','reviewing','reviewed','archived')),
  mentor_feedback TEXT,
  score NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS career_user_goals (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  target_role VARCHAR(255),
  target_sector VARCHAR(255),
  target_location VARCHAR(255),
  interview_date DATE,
  weekly_target INTEGER NOT NULL DEFAULT 3,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_career_attempts_user_date ON career_practice_attempts(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_career_cv_user_date ON career_cv_submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_career_resources_type ON career_resources(resource_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_career_sessions_student_status ON career_sessions(student_id, status, created_at DESC);

-- Questions d'entretien originales StudyLink.
INSERT INTO career_interview_questions(category,question,guidance,difficulty,sort_order) VALUES
('hr','Présentez-vous en deux minutes.','Structurez votre réponse : présent, expérience clé, objectif visé.','beginner',1),
('hr','Pourquoi souhaitez-vous rejoindre cette entreprise ?','Reliez vos motivations à la mission, au poste et à une contribution concrète.','beginner',2),
('hr','Quelle est votre principale faiblesse professionnelle ?','Choisissez un vrai axe de progrès et montrez le plan mis en place.','intermediate',3),
('hr','Parlez-moi d’un conflit que vous avez résolu.','Utilisez la méthode STAR : situation, tâche, action, résultat.','intermediate',4),
('hr','Pourquoi devrions-nous vous recruter ?','Résumez trois preuves directement liées au besoin du poste.','intermediate',5),
('technical','Expliquez un projet technique dont vous êtes fier.','Décrivez le problème, vos décisions, les difficultés et l’impact.','beginner',1),
('technical','Comment abordez-vous un problème que vous ne savez pas résoudre ?','Montrez votre démarche : clarification, hypothèses, recherche, test, validation.','intermediate',2),
('technical','Racontez une erreur technique et ce que vous avez appris.','Mettez l’accent sur la responsabilité et l’amélioration du processus.','intermediate',3),
('technical','Comment garantissez-vous la qualité de votre travail ?','Citez tests, revue, documentation, mesure et feedback.','advanced',4),
('technical','Expliquez un concept complexe à une personne non technique.','Commencez par une analogie puis vérifiez la compréhension.','advanced',5),
('behavioral','Donnez un exemple de leadership sans autorité hiérarchique.','Montrez comment vous avez influencé par la clarté et la confiance.','intermediate',1),
('behavioral','Comment gérez-vous plusieurs priorités urgentes ?','Expliquez vos critères d’impact, dépendance, délai et communication.','intermediate',2),
('behavioral','Parlez d’un objectif difficile que vous avez atteint.','Quantifiez le résultat et expliquez les obstacles dépassés.','intermediate',3),
('behavioral','Comment réagissez-vous à un feedback difficile ?','Montrez écoute, clarification, plan d’action et suivi.','beginner',4),
('behavioral','Racontez une situation où vous avez dû apprendre très vite.','Expliquez votre méthode d’apprentissage et le résultat obtenu.','intermediate',5)
ON CONFLICT (category,question) DO NOTHING;

-- Ressources de carrière originales, utilisables directement dans l'application.
INSERT INTO career_resources(author_id,title,resource_type,description,url,is_free)
SELECT a.id, x.title, x.resource_type, x.description, x.url, true
FROM (SELECT id FROM users WHERE role='admin' ORDER BY created_at LIMIT 1) a
CROSS JOIN (VALUES
('10 questions pièges en entretien','interview_questions','Préparez les questions qui déstabilisent le plus souvent les candidats.','/career-prep?tool=questions'),
('Construire un pitch de 2 minutes','video','Méthode concise pour présenter votre parcours et votre valeur.','/career-prep?tool=pitch'),
('Checklist 24 h avant l’entretien','checklist','Documents, tenue, recherche entreprise et préparation logistique.','/career-prep?tool=checklist'),
('Méthode STAR en pratique','article','Transformez vos expériences en réponses structurées et convaincantes.','/career-prep?tool=star'),
('CV : contrôle qualité en 15 points','cv_template','Vérifiez lisibilité, impact, cohérence et adaptation au poste.','/career-prep?tool=cv'),
('Questions à poser au recruteur','interview_questions','Une sélection de questions utiles pour la fin de l’entretien.','/career-prep?tool=questions-to-ask'),
('Préparer un entretien technique','article','Plan en quatre étapes pour réviser et communiquer votre raisonnement.','/career-prep?tool=technical'),
('Négocier son salaire','article','Préparez votre fourchette, vos arguments et vos alternatives.','/career-prep?tool=salary'),
('Relance après entretien','cover_letter','Trois modèles de messages professionnels après une rencontre.','/career-prep?tool=follow-up')
) AS x(title,resource_type,description,url)
WHERE a.id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM career_resources cr WHERE cr.title=x.title);
