-- STUDYLINK - MODULE DEVELOPPEMENT PERSONNEL COMPLET
-- Idempotent: peut être relancé sans dupliquer les contenus.

CREATE TABLE IF NOT EXISTS book_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(book_id, chapter_number)
);

CREATE INDEX IF NOT EXISTS idx_personal_program_days_program_day
  ON personal_program_days(program_id, day_number);
CREATE INDEX IF NOT EXISTS idx_personal_program_tasks_day_position
  ON personal_program_tasks(program_day_id, position);
CREATE INDEX IF NOT EXISTS idx_personal_enrollments_user_updated
  ON personal_program_enrollments(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_book_chapters_book_number
  ON book_chapters(book_id, chapter_number);

DO $$
DECLARE
  v_author UUID;
  v_cat INTEGER;
  v_program UUID;
  v_book UUID;
  p RECORD;
  b RECORD;
  d INTEGER;
  c INTEGER;
  day_titles TEXT[];
  day_title TEXT;
  cat_slug TEXT;
BEGIN
  SELECT id INTO v_author FROM users WHERE role='admin' ORDER BY created_at LIMIT 1;
  IF v_author IS NULL THEN SELECT id INTO v_author FROM users ORDER BY created_at LIMIT 1; END IF;
  IF v_author IS NULL THEN RAISE EXCEPTION 'Aucun utilisateur disponible pour devenir auteur des contenus.'; END IF;

  -- Catégories du module
  FOR p IN SELECT * FROM (VALUES
    ('Discipline','discipline',10),('Yoga','yoga',20),('Méditation','meditation',30),
    ('Productivité','productivite',40),('Confiance en soi','confiance-en-soi',50),
    ('Habitudes','habitudes',60),('Bien-être','bien-etre',70),
    ('Intelligence émotionnelle','intelligence-emotionnelle',80)
  ) AS x(name,slug,sort_order)
  LOOP
    INSERT INTO learning_categories(name,slug,universe,sort_order)
    VALUES(p.name,p.slug,'personal_development',p.sort_order)
    ON CONFLICT (slug) DO UPDATE SET universe='personal_development', sort_order=EXCLUDED.sort_order;
  END LOOP;

  -- Programmes phares. Les descriptions et tâches sont des contenus originaux StudyLink.
  FOR p IN SELECT * FROM (VALUES
    ('Discipline 30 jours','discipline-30','Discipline',30,'beginner',
      'Construisez une discipline durable grâce à une progression quotidienne, des micro-engagements et des bilans concrets.',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=85'),
    ('Yoga du matin','yoga-du-matin','Yoga',21,'all',
      'Une routine douce pour réveiller le corps, améliorer la mobilité et commencer la journée avec énergie.',
      'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=1400&q=85'),
    ('Routine anti-procrastination','routine-anti-procrastination','Productivité',14,'beginner',
      'Passez de l’intention à l’action avec des techniques simples de découpage, démarrage et concentration.',
      'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=1400&q=85'),
    ('Méditation 21 jours','meditation-21-jours','Méditation',21,'beginner',
      'Apprenez à respirer, observer vos pensées et réduire la tension mentale en quelques minutes par jour.',
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1400&q=85'),
    ('Confiance en soi','confiance-en-soi-21','Confiance en soi',21,'all',
      'Développez une parole plus assurée, une image de soi réaliste et le courage de passer à l’action.',
      'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=1400&q=85'),
    ('Habitudes solides','habitudes-solides','Habitudes',28,'all',
      'Concevez des habitudes faciles à démarrer, mesurables et compatibles avec votre quotidien.',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1400&q=85'),
    ('Équilibre & bien-être','equilibre-bien-etre','Bien-être',14,'all',
      'Rééquilibrez sommeil, récupération, mouvement et temps personnel grâce à un plan réaliste.',
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1400&q=85'),
    ('Intelligence émotionnelle','intelligence-emotionnelle-21','Intelligence émotionnelle',21,'intermediate',
      'Identifiez vos émotions, régulez vos réactions et améliorez vos relations au quotidien.',
      'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=1400&q=85')
  ) AS x(title,slug,category,duration_days,level,description,cover_url)
  LOOP
    SELECT id INTO v_cat FROM learning_categories WHERE slug = CASE p.category
      WHEN 'Discipline' THEN 'discipline' WHEN 'Yoga' THEN 'yoga' WHEN 'Méditation' THEN 'meditation'
      WHEN 'Productivité' THEN 'productivite' WHEN 'Confiance en soi' THEN 'confiance-en-soi'
      WHEN 'Habitudes' THEN 'habitudes' WHEN 'Bien-être' THEN 'bien-etre'
      ELSE 'intelligence-emotionnelle' END;

    INSERT INTO personal_programs(author_id,category_id,title,slug,description,cover_url,duration_days,level,status)
    VALUES(v_author,v_cat,p.title,p.slug,p.description,p.cover_url,p.duration_days,p.level,'published')
    ON CONFLICT (slug) DO UPDATE SET
      category_id=EXCLUDED.category_id, title=EXCLUDED.title, description=EXCLUDED.description,
      cover_url=EXCLUDED.cover_url, duration_days=EXCLUDED.duration_days, level=EXCLUDED.level, status='published'
    RETURNING id INTO v_program;

    IF NOT EXISTS (SELECT 1 FROM personal_program_days WHERE program_id=v_program) THEN
      day_titles := CASE p.category
        WHEN 'Discipline' THEN ARRAY['Clarifier votre objectif','Commencer minuscule','Protéger le premier créneau','Supprimer une distraction','Tenir sa promesse','Réagir après un écart','Bilan de la semaine']
        WHEN 'Yoga' THEN ARRAY['Respiration et ancrage','Mobiliser la colonne','Ouvrir les hanches','Renforcer le centre','Équilibre debout','Étirements doux','Séquence complète']
        WHEN 'Méditation' THEN ARRAY['Respirer consciemment','Observer le corps','Laisser passer les pensées','Revenir au présent','Accueillir une émotion','Cultiver la gratitude','Méditation complète']
        WHEN 'Productivité' THEN ARRAY['Définir la prochaine action','Découper une tâche','Rituel de démarrage','Bloquer les distractions','Travailler en cycles','Finir avant de perfectionner','Bilan et plan suivant']
        WHEN 'Confiance en soi' THEN ARRAY['Vos forces réelles','Changer le dialogue intérieur','Prendre une petite initiative','Parler avec clarté','Poser une limite','Agir malgré l’inconfort','Bilan de progression']
        WHEN 'Habitudes' THEN ARRAY['Choisir une habitude','Définir le déclencheur','Réduire la friction','Rendre le progrès visible','Préparer les jours difficiles','Récompenser la constance','Révision du système']
        WHEN 'Bien-être' THEN ARRAY['Audit d’énergie','Sommeil plus régulier','Bouger sans pression','Créer une vraie pause','Réduire la surcharge','Planifier la récupération','Bilan équilibre']
        ELSE ARRAY['Nommer l’émotion','Identifier le déclencheur','Créer une pause','Choisir sa réponse','Écouter sans défendre','Exprimer un besoin','Bilan relationnel']
      END;

      FOR d IN 1..p.duration_days LOOP
        day_title := day_titles[((d-1) % array_length(day_titles,1))+1];
        INSERT INTO personal_program_days(program_id,day_number,title,description)
        VALUES(v_program,d,day_title,
          format('Jour %s : pratiquez « %s ». Prenez quelques minutes pour appliquer l’exercice, puis notez ce que vous avez observé.', d, day_title))
        RETURNING id INTO v_book;

        INSERT INTO personal_program_tasks(program_day_id,title,description,position) VALUES
          (v_book,'Faire la pratique du jour',format('Consacrez au moins 10 minutes à : %s.',day_title),1),
          (v_book,'Noter une observation','Écrivez une phrase sur ce qui a été facile, difficile ou utile.',2);
      END LOOP;
    END IF;
  END LOOP;

  -- Livres originaux StudyLink avec chapitres lisibles dans l'application.
  FOR b IN SELECT * FROM (VALUES
    ('Le guide pratique de la discipline','guide-discipline-studylink','Discipline','StudyLink Academy',
      'Un guide concret pour transformer une intention en système quotidien.',160,
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=85'),
    ('Construire des habitudes qui durent','habitudes-qui-durent','Habitudes','StudyLink Academy',
      'Déclencheurs, environnement, répétition et reprise après un écart.',184,
      'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=900&q=85'),
    ('Le travail profond au quotidien','travail-profond-quotidien','Productivité','StudyLink Academy',
      'Organisez des périodes de concentration réalistes et protégez votre attention.',152,
      'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=900&q=85'),
    ('Yoga : commencer simplement','yoga-commencer-simplement','Yoga','StudyLink Academy',
      'Respiration, mobilité et séquences courtes pour débuter en sécurité.',144,
      'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=900&q=85'),
    ('Méditer sans se compliquer','mediter-sans-se-compliquer','Méditation','StudyLink Academy',
      'Des pratiques courtes pour développer l’attention et réduire la tension.',136,
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=85'),
    ('Confiance : agir avant d’être prêt','confiance-agir-avant-pret','Confiance en soi','StudyLink Academy',
      'Construisez la confiance par l’action, l’exposition graduelle et le feedback.',168,
      'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=900&q=85'),
    ('Équilibre personnel','equilibre-personnel-guide','Bien-être','StudyLink Academy',
      'Un système simple pour mieux répartir énergie, repos, travail et relations.',148,
      'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=900&q=85'),
    ('Comprendre ses émotions','comprendre-ses-emotions','Intelligence émotionnelle','StudyLink Academy',
      'Identifier, nommer et réguler les émotions sans les nier.',172,
      'https://images.unsplash.com/photo-1516302752625-fcc3c50ae61f?auto=format&fit=crop&w=900&q=85')
  ) AS x(title,slug,category,author_name,description,page_count,cover_url)
  LOOP
    SELECT id INTO v_cat FROM learning_categories WHERE name=b.category AND universe='personal_development' LIMIT 1;
    INSERT INTO books(uploaded_by,category_id,title,slug,author_name,description,cover_url,file_type,language,page_count,is_free,rights_status,status)
    VALUES(v_author,v_cat,b.title,b.slug,b.author_name,b.description,b.cover_url,'external','fr',b.page_count,true,'owned','published')
    ON CONFLICT (slug) DO UPDATE SET category_id=EXCLUDED.category_id,title=EXCLUDED.title,description=EXCLUDED.description,
      cover_url=EXCLUDED.cover_url,page_count=EXCLUDED.page_count,status='published'
    RETURNING id INTO v_book;

    IF NOT EXISTS (SELECT 1 FROM book_chapters WHERE book_id=v_book) THEN
      FOR c IN 1..6 LOOP
        INSERT INTO book_chapters(book_id,chapter_number,title,content,estimated_minutes)
        VALUES(v_book,c,
          CASE c WHEN 1 THEN 'Faire le point' WHEN 2 THEN 'Comprendre le mécanisme' WHEN 3 THEN 'Commencer petit'
                 WHEN 4 THEN 'Construire un système' WHEN 5 THEN 'Gérer les jours difficiles' ELSE 'Plan de continuité' END,
          format('Chapitre %s — %s\n\nLe progrès durable ne repose pas sur une motivation parfaite. Il repose sur un environnement, une prochaine action claire et une manière simple de reprendre après un écart.\n\nCommencez par observer votre situation actuelle sans jugement. Choisissez ensuite une action suffisamment petite pour être réalisée même pendant une journée chargée. Rendez cette action visible, mesurable et facile à répéter.\n\nExercice : notez une décision concrète que vous pouvez appliquer aujourd’hui. Définissez quand, où et pendant combien de temps vous allez la réaliser. À la fin, écrivez une phrase sur ce que vous avez appris.\n\nL’objectif de ce chapitre n’est pas la perfection. C’est la création d’un système que vous pouvez continuer à améliorer.', c,
            CASE c WHEN 1 THEN 'Faire le point' WHEN 2 THEN 'Comprendre le mécanisme' WHEN 3 THEN 'Commencer petit'
                   WHEN 4 THEN 'Construire un système' WHEN 5 THEN 'Gérer les jours difficiles' ELSE 'Plan de continuité' END),
          8 + c);
      END LOOP;
    END IF;
  END LOOP;
END $$;
