-- StudyLink 011 - Formations completes pour les 32 cours du catalogue
-- Idempotent : enrichit les cours existants sans supprimer les inscriptions ni la progression.
-- Prerequis : migrations 003 et 010.

DO $$
DECLARE
  rec RECORD;
  v_course UUID;
  v_module UUID;
  v_lesson UUID;
  module_pos INTEGER;
  lesson_pos INTEGER;
  module_title TEXT;
  module_desc TEXT;
  lesson_title TEXT;
  lesson_content TEXT;
  lesson_kind TEXT;
  objective_a TEXT;
  objective_b TEXT;
  objective_c TEXT;
BEGIN
  FOR rec IN SELECT * FROM (VALUES
    ('python-pour-debutants-complet','Python pour débutants',ARRAY['Comprendre la syntaxe Python','Manipuler variables et collections','Créer un projet pratique']::text[]),
    ('java-spring-boot','Java & Spring Boot',ARRAY['Maîtriser Java moderne','Créer une API REST','Connecter une base de données']::text[]),
    ('web-react-moderne','Développement Web avec React',ARRAY['Comprendre les composants','Gérer l’état','Construire une application complète']::text[]),
    ('cybersecurite-fondamentaux','Cybersécurité : fondamentaux',ARRAY['Comprendre les menaces','Sécuriser les accès','Appliquer les bonnes pratiques']::text[]),
    ('algebre-lineaire','Algèbre linéaire appliquée',ARRAY['Calculer avec les matrices','Comprendre les espaces vectoriels','Résoudre des systèmes']::text[]),
    ('analyse-calcul-differentiel','Analyse & calcul différentiel',ARRAY['Maîtriser les limites','Calculer des dérivées','Résoudre des intégrales']::text[]),
    ('probabilites-statistiques','Probabilités & statistiques',ARRAY['Calculer des probabilités','Comprendre les distributions','Interpréter les tests']::text[]),
    ('optimisation-mathematique','Optimisation mathématique',ARRAY['Formuler un modèle','Résoudre des contraintes','Analyser la solution']::text[]),
    ('mecanique-classique','Mécanique classique',ARRAY['Appliquer les lois de Newton','Étudier l’énergie','Résoudre des mouvements']::text[]),
    ('electromagnetisme','Électromagnétisme',ARRAY['Comprendre les champs','Analyser les circuits','Relier électricité et magnétisme']::text[]),
    ('physique-quantique','Introduction à la physique quantique',ARRAY['Comprendre la dualité','Étudier les états quantiques','Interpréter les mesures']::text[]),
    ('physique-nucleaire','Physique nucléaire & radioprotection',ARRAY['Comprendre les rayonnements','Mesurer une dose','Appliquer la radioprotection']::text[]),
    ('allemand-b1','Allemand B1 pratique',ARRAY['Renforcer la grammaire','Développer le vocabulaire','Pratiquer l’oral']::text[]),
    ('anglais-professionnel','Anglais professionnel',ARRAY['Rédiger des emails','Présenter un projet','Participer à une réunion']::text[]),
    ('francais-academique','Français académique',ARRAY['Structurer un texte','Améliorer le style','Corriger les erreurs']::text[]),
    ('espagnol-debutant','Espagnol pour débutants',ARRAY['Se présenter','Comprendre les bases','Tenir une conversation simple']::text[]),
    ('cv-impactant','Créer un CV impactant',ARRAY['Structurer le CV','Valoriser les compétences','Adapter au poste']::text[]),
    ('entretien-embauche','Réussir son entretien d’embauche',ARRAY['Préparer son pitch','Répondre aux questions','Gérer le stress']::text[]),
    ('linkedin-personal-branding','LinkedIn & personal branding',ARRAY['Optimiser son profil','Développer son réseau','Créer du contenu']::text[]),
    ('entretien-technique','Entretien technique développeur',ARRAY['Résoudre les exercices','Expliquer sa démarche','Préparer le système design']::text[]),
    ('discipline-30-jours-course','Discipline 30 jours',ARRAY['Créer une routine','Suivre ses habitudes','Renforcer la constance']::text[]),
    ('yoga-matin-course','Yoga du matin',ARRAY['Améliorer la mobilité','Respirer consciemment','Créer une routine']::text[]),
    ('meditation-stress','Méditation & gestion du stress',ARRAY['Respirer profondément','Observer les pensées','Réduire le stress']::text[]),
    ('productivite-focus','Productivité & concentration',ARRAY['Planifier efficacement','Éliminer les distractions','Travailler en profondeur']::text[]),
    ('machine-learning-pratique','Machine Learning pratique',ARRAY['Préparer les données','Entraîner un modèle','Évaluer les performances']::text[]),
    ('data-analysis-python','Analyse de données avec Python',ARRAY['Nettoyer les données','Analyser avec Pandas','Créer des visualisations']::text[]),
    ('deep-learning-intro','Introduction au Deep Learning',ARRAY['Comprendre les neurones','Construire un réseau','Entraîner un modèle']::text[]),
    ('sql-data-analytics','SQL pour la Data',ARRAY['Écrire des requêtes','Joindre des tables','Analyser des données']::text[]),
    ('business-plan-complet','Créer son business plan',ARRAY['Analyser le marché','Construire le modèle économique','Préparer les finances']::text[]),
    ('marketing-digital','Marketing digital',ARRAY['Définir une stratégie','Créer du contenu','Mesurer les résultats']::text[]),
    ('finance-entrepreneurs','Finance pour entrepreneurs',ARRAY['Construire un budget','Suivre la trésorerie','Mesurer la rentabilité']::text[]),
    ('vente-negociation','Vente & négociation',ARRAY['Prospecter efficacement','Conduire un entretien','Négocier avec confiance']::text[])
  ) AS catalogue(slug,title,objectives)
  LOOP
    SELECT id INTO v_course FROM public.courses WHERE slug=rec.slug LIMIT 1;
    IF v_course IS NULL THEN
      CONTINUE;
    END IF;

    objective_a := COALESCE(rec.objectives[1], 'Comprendre les notions essentielles');
    objective_b := COALESCE(rec.objectives[2], 'Mettre en pratique les méthodes');
    objective_c := COALESCE(rec.objectives[3], 'Réaliser un projet concret');

    FOR module_pos IN 1..5 LOOP
      module_title := CASE module_pos
        WHEN 1 THEN 'Bien démarrer avec ' || rec.title
        WHEN 2 THEN 'Fondamentaux et méthodes'
        WHEN 3 THEN 'Mise en pratique guidée'
        WHEN 4 THEN 'Approfondissement et résolution de problèmes'
        ELSE 'Projet final et validation'
      END;

      module_desc := CASE module_pos
        WHEN 1 THEN 'Comprendre le parcours, le vocabulaire et les premières notions indispensables.'
        WHEN 2 THEN 'Construire des bases solides autour des objectifs principaux de la formation.'
        WHEN 3 THEN 'Appliquer les acquis avec des exercices guidés et des cas concrets.'
        WHEN 4 THEN 'Résoudre des situations plus complexes et améliorer sa méthode.'
        ELSE 'Réaliser un projet complet, valider les acquis et préparer la suite.'
      END;

      INSERT INTO public.course_modules(course_id,title,description,position)
      VALUES(v_course,module_title,module_desc,module_pos)
      ON CONFLICT (course_id,position)
      DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description
      RETURNING id INTO v_module;

      FOR lesson_pos IN 1..4 LOOP
        lesson_title := CASE
          WHEN module_pos=1 AND lesson_pos=1 THEN 'Bienvenue, objectifs et plan de progression'
          WHEN module_pos=1 AND lesson_pos=2 THEN 'Vocabulaire et concepts essentiels'
          WHEN module_pos=1 AND lesson_pos=3 THEN 'Premier cas concret : observer et comprendre'
          WHEN module_pos=1 AND lesson_pos=4 THEN 'Checkpoint : valider les bases'

          WHEN module_pos=2 AND lesson_pos=1 THEN objective_a
          WHEN module_pos=2 AND lesson_pos=2 THEN objective_b
          WHEN module_pos=2 AND lesson_pos=3 THEN objective_c
          WHEN module_pos=2 AND lesson_pos=4 THEN 'Exercice de synthèse des fondamentaux'

          WHEN module_pos=3 AND lesson_pos=1 THEN 'Démonstration guidée pas à pas'
          WHEN module_pos=3 AND lesson_pos=2 THEN 'Atelier pratique : à vous de jouer'
          WHEN module_pos=3 AND lesson_pos=3 THEN 'Erreurs fréquentes et méthode de correction'
          WHEN module_pos=3 AND lesson_pos=4 THEN 'Étude de cas complète'

          WHEN module_pos=4 AND lesson_pos=1 THEN 'Méthodes avancées et bonnes pratiques'
          WHEN module_pos=4 AND lesson_pos=2 THEN 'Résoudre un problème complexe'
          WHEN module_pos=4 AND lesson_pos=3 THEN 'Optimiser sa démarche et gagner en autonomie'
          WHEN module_pos=4 AND lesson_pos=4 THEN 'Quiz de validation intermédiaire'

          WHEN module_pos=5 AND lesson_pos=1 THEN 'Cadrer le projet final'
          WHEN module_pos=5 AND lesson_pos=2 THEN 'Projet final : conception et préparation'
          WHEN module_pos=5 AND lesson_pos=3 THEN 'Projet final : réalisation et amélioration'
          ELSE 'Bilan final, auto-évaluation et prochaines étapes'
        END;

        lesson_kind := CASE
          WHEN lesson_pos=4 AND module_pos IN (1,4) THEN 'quiz'
          WHEN lesson_pos IN (3,4) AND module_pos IN (2,3,5) THEN 'exercise'
          ELSE 'text'
        END;

        lesson_content :=
          'FORMATION : ' || rec.title || E'\n\n' ||
          'LEÇON : ' || lesson_title || E'\n\n' ||
          CASE module_pos
            WHEN 1 THEN
              'Objectif : comprendre le cadre de la formation et acquérir les repères nécessaires. ' ||
              'Prenez le temps de relier cette leçon à une situation réelle que vous connaissez déjà.'
            WHEN 2 THEN
              'Objectif : construire une compréhension solide des fondamentaux. ' ||
              'Concentrez-vous sur ces trois résultats attendus : ' || objective_a || ' ; ' || objective_b || ' ; ' || objective_c || '.'
            WHEN 3 THEN
              'Objectif : transformer la théorie en compétence utilisable. Suivez la méthode, réalisez l’activité, puis comparez votre résultat aux critères indiqués.'
            WHEN 4 THEN
              'Objectif : gagner en autonomie. Analysez la situation, choisissez une méthode, justifiez vos décisions et vérifiez la qualité du résultat.'
            ELSE
              'Objectif : mobiliser l’ensemble des compétences du parcours dans une réalisation finale. Documentez votre démarche et tirez un bilan personnel.'
          END ||
          E'\n\nMÉTHODE DE TRAVAIL\n' ||
          '1. Lisez l’explication une première fois sans chercher à tout mémoriser.' || E'\n' ||
          '2. Reformulez l’idée principale avec vos propres mots.' || E'\n' ||
          '3. Réalisez l’activité demandée sans copier la solution.' || E'\n' ||
          '4. Notez vos difficultés dans l’onglet Notes.' || E'\n' ||
          '5. Marquez la leçon comme terminée uniquement lorsque vous pouvez expliquer ce que vous avez appris.' ||
          E'\n\nACTIVITÉ\n' ||
          CASE lesson_kind
            WHEN 'quiz' THEN 'Répondez aux questions de contrôle, identifiez les points encore fragiles et revenez sur la leçon précédente si nécessaire.'
            WHEN 'exercise' THEN 'Produisez un résultat concret. Testez au moins une variante, notez une erreur rencontrée et expliquez comment vous l’avez corrigée.'
            ELSE 'Créez un résumé de 5 lignes, donnez un exemple concret et formulez une question que vous pourriez poser à un tuteur.'
          END ||
          E'\n\nCRITÈRES DE RÉUSSITE\n' ||
          '• Vous pouvez expliquer l’idée principale sans lire le texte.' || E'\n' ||
          '• Vous pouvez donner un exemple adapté à ' || rec.title || '.' || E'\n' ||
          '• Vous savez quelle étape réaliser ensuite dans le parcours.';

        INSERT INTO public.lessons(
          module_id,title,slug,lesson_type,content,duration_seconds,position,is_preview
        )
        VALUES(
          v_module,
          lesson_title,
          rec.slug || '-m' || module_pos || '-l' || lesson_pos,
          lesson_kind,
          lesson_content,
          CASE WHEN lesson_kind='exercise' THEN 2100 WHEN lesson_kind='quiz' THEN 1200 ELSE 1500 END,
          lesson_pos,
          (module_pos=1 AND lesson_pos=1)
        )
        ON CONFLICT (module_id,position)
        DO UPDATE SET
          title=EXCLUDED.title,
          slug=EXCLUDED.slug,
          lesson_type=EXCLUDED.lesson_type,
          content=EXCLUDED.content,
          duration_seconds=EXCLUDED.duration_seconds,
          is_preview=EXCLUDED.is_preview
        RETURNING id INTO v_lesson;

        -- Une ressource interne de synthese par lecon, sans duplication.
        INSERT INTO public.lesson_resources(lesson_id,title,resource_type,url)
        SELECT v_lesson,
               'Fiche de travail — ' || lesson_title,
               'other',
               '/courses/' || rec.slug || '/modules'
        WHERE NOT EXISTS (
          SELECT 1 FROM public.lesson_resources
          WHERE lesson_id=v_lesson AND title='Fiche de travail — ' || lesson_title
        );
      END LOOP;
    END LOOP;

    UPDATE public.courses
    SET description = COALESCE(NULLIF(description,''), short_description) ||
      E'\n\nParcours complet : 5 modules, 20 leçons, exercices progressifs, études de cas et projet final.',
      estimated_minutes = GREATEST(estimated_minutes, 500),
      status='published',
      published_at=COALESCE(published_at,now()),
      updated_at=now()
    WHERE id=v_course;
  END LOOP;
END $$;

-- Verification
SELECT c.title, c.slug,
  COUNT(DISTINCT cm.id) AS modules,
  COUNT(DISTINCT l.id) AS lessons
FROM public.courses c
LEFT JOIN public.course_modules cm ON cm.course_id=c.id
LEFT JOIN public.lessons l ON l.module_id=cm.id
WHERE c.slug IN ('python-pour-debutants-complet','java-spring-boot','web-react-moderne','cybersecurite-fondamentaux','algebre-lineaire','analyse-calcul-differentiel','probabilites-statistiques','optimisation-mathematique','mecanique-classique','electromagnetisme','physique-quantique','physique-nucleaire','allemand-b1','anglais-professionnel','francais-academique','espagnol-debutant','cv-impactant','entretien-embauche','linkedin-personal-branding','entretien-technique','discipline-30-jours-course','yoga-matin-course','meditation-stress','productivite-focus','machine-learning-pratique','data-analysis-python','deep-learning-intro','sql-data-analytics','business-plan-complet','marketing-digital','finance-entrepreneurs','vente-negociation')
GROUP BY c.id,c.title,c.slug
ORDER BY c.title;
