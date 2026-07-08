-- STUDYLINK — COURS PYTHON COMPLET ET FONCTIONNEL
-- À exécuter une fois dans Supabase > SQL Editor.
-- Le script est idempotent : il peut être rejoué sans dupliquer le cours.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Catégorie Informatique.
INSERT INTO learning_categories(name, slug, description, icon, color)
VALUES ('Informatique', 'informatique', 'Programmation, développement, systèmes et outils numériques.', 'code', '#1769ff')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

DO $$
DECLARE
  v_author UUID;
  v_category INTEGER;
  v_course UUID;
  m1 UUID := '11000000-0000-4000-8000-000000000001';
  m2 UUID := '11000000-0000-4000-8000-000000000002';
  m3 UUID := '11000000-0000-4000-8000-000000000003';
  m4 UUID := '11000000-0000-4000-8000-000000000004';
  m5 UUID := '11000000-0000-4000-8000-000000000005';
  m6 UUID := '11000000-0000-4000-8000-000000000006';
BEGIN
  SELECT id INTO v_author FROM users WHERE role='admin' ORDER BY created_at LIMIT 1;
  IF v_author IS NULL THEN
    SELECT id INTO v_author FROM users ORDER BY created_at LIMIT 1;
  END IF;
  IF v_author IS NULL THEN
    RAISE EXCEPTION 'Créez au moins un utilisateur StudyLink avant d’exécuter cette migration.';
  END IF;

  SELECT id INTO v_category FROM learning_categories WHERE slug='informatique' LIMIT 1;
  SELECT id INTO v_course FROM courses WHERE slug='python-pour-debutants-complet' LIMIT 1;
  IF v_course IS NULL THEN v_course := '10000000-0000-4000-8000-000000000001'; END IF;

  INSERT INTO courses(
    id, author_id, category_id, title, slug, short_description, description,
    cover_url, level, language, estimated_minutes, price, is_free, status,
    content_type, objectives, prerequisites, published_at
  ) VALUES (
    v_course,
    v_author,
    v_category,
    'Python pour débutants',
    'python-pour-debutants-complet',
    'Apprenez Python pas à pas avec des vidéos, des exercices, des ressources officielles et un projet final.',
    'Un parcours progressif conçu pour les vrais débutants. Vous commencez par installer votre environnement et écrire votre premier programme, puis vous découvrez les variables, les conditions, les boucles, les fonctions, les collections et l’organisation d’un projet Python. Chaque module combine vidéo, explications, pratique et ressources complémentaires.',
    'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=1600&q=85',
    'beginner', 'fr', 390, 0, true, 'published', 'course',
    ARRAY[
      'Installer Python et préparer un environnement de travail simple',
      'Comprendre la syntaxe, les variables et les types de données',
      'Utiliser les conditions et les boucles pour automatiser des tâches',
      'Créer des fonctions réutilisables et organiser son code',
      'Manipuler listes, dictionnaires et autres collections',
      'Construire un mini-projet complet et présenter son résultat'
    ],
    ARRAY['Aucune expérience en programmation requise', 'Un ordinateur et une connexion Internet'],
    now()
  ) ON CONFLICT (slug) DO UPDATE SET
    author_id=EXCLUDED.author_id,
    category_id=EXCLUDED.category_id,
    title=EXCLUDED.title,
    slug=EXCLUDED.slug,
    short_description=EXCLUDED.short_description,
    description=EXCLUDED.description,
    cover_url=EXCLUDED.cover_url,
    level=EXCLUDED.level,
    language=EXCLUDED.language,
    estimated_minutes=EXCLUDED.estimated_minutes,
    status='published',
    objectives=EXCLUDED.objectives,
    prerequisites=EXCLUDED.prerequisites,
    published_at=COALESCE(courses.published_at, now()),
    updated_at=now();

  SELECT id INTO v_course FROM courses WHERE slug='python-pour-debutants-complet' LIMIT 1;

  -- Modules
  INSERT INTO course_modules(id,course_id,title,description,position) VALUES
    (m1,v_course,'Découvrir Python','Comprendre à quoi sert Python, installer les outils et exécuter un premier programme.',1),
    (m2,v_course,'Variables et types','Manipuler du texte, des nombres, des entrées utilisateur et des conversions.',2),
    (m3,v_course,'Conditions et boucles','Prendre des décisions et répéter automatiquement des actions.',3),
    (m4,v_course,'Fonctions et organisation du code','Créer des fonctions claires et réutiliser du code avec des modules.',4),
    (m5,v_course,'Collections et données','Travailler avec des listes, dictionnaires et structures de données courantes.',5),
    (m6,v_course,'Projet final','Assembler les acquis dans un mini-projet guidé et préparer la suite.',6)
  ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,position=EXCLUDED.position;

  -- Leçons : Module 1
  INSERT INTO lessons(id,module_id,title,slug,lesson_type,content,youtube_url,youtube_video_id,duration_seconds,position,is_preview) VALUES
    ('12000000-0000-4000-8000-000000000001',m1,'Bienvenue : pourquoi apprendre Python ?','pourquoi-python','youtube','Python est un langage polyvalent utilisé pour l’automatisation, le web, la data et l’intelligence artificielle. Dans cette leçon, identifiez vos objectifs et découvrez le parcours.\n\nÀ faire : notez une tâche que vous aimeriez automatiser avec Python.','https://www.youtube.com/watch?v=jFCNu1-Xdsw','jFCNu1-Xdsw',390,1,true),
    ('12000000-0000-4000-8000-000000000002',m1,'Installer Python et préparer VS Code','installer-python-vscode','youtube','Installez Python, vérifiez la commande python --version, puis préparez un éditeur.\n\nObjectif pratique : créer un dossier studylink-python et un fichier main.py.','https://www.youtube.com/watch?v=D2cwvpJSBX4','D2cwvpJSBX4',720,2,true),
    ('12000000-0000-4000-8000-000000000003',m1,'Votre premier programme : Hello World','premier-programme','youtube','Écrivez et exécutez :\n\nprint("Hello, StudyLink !")\n\nModifiez ensuite le texte pour afficher votre prénom et votre objectif d’apprentissage.','https://www.youtube.com/watch?v=wWwr0tDSqnE','wWwr0tDSqnE',420,3,false)
  ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,content=EXCLUDED.content,youtube_url=EXCLUDED.youtube_url,youtube_video_id=EXCLUDED.youtube_video_id,duration_seconds=EXCLUDED.duration_seconds,position=EXCLUDED.position;

  -- Module 2
  INSERT INTO lessons(id,module_id,title,slug,lesson_type,content,youtube_url,youtube_video_id,duration_seconds,position,is_preview) VALUES
    ('12000000-0000-4000-8000-000000000004',m2,'Chaînes de caractères','chaines-caracteres','youtube','Une chaîne de caractères représente du texte. Testez les guillemets simples et doubles, la concaténation et len().\n\nExercice : demandez le prénom de l’utilisateur et affichez un message personnalisé.','https://www.youtube.com/watch?v=tSebLz1hNpA','tSebLz1hNpA',510,1,false),
    ('12000000-0000-4000-8000-000000000005',m2,'Nombres et calculs','nombres-calculs','youtube','Découvrez int, float et les opérateurs +, -, *, /, //, % et **.\n\nExercice : calculez le prix TTC à partir d’un prix HT et d’un taux de TVA.','https://www.youtube.com/watch?v=5yhn0MFLcu8','5yhn0MFLcu8',540,2,false),
    ('12000000-0000-4000-8000-000000000006',m2,'Mini-exercice : convertisseur simple','convertisseur-simple','exercise','Créez un programme qui demande une température en degrés Celsius et affiche sa conversion en Fahrenheit.\n\nFormule : F = C × 9/5 + 32.\n\nBonus : affichez le résultat avec une seule décimale.',NULL,NULL,900,3,false)
  ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,content=EXCLUDED.content,youtube_url=EXCLUDED.youtube_url,youtube_video_id=EXCLUDED.youtube_video_id,duration_seconds=EXCLUDED.duration_seconds,position=EXCLUDED.position;

  -- Module 3
  INSERT INTO lessons(id,module_id,title,slug,lesson_type,content,youtube_url,youtube_video_id,duration_seconds,position,is_preview) VALUES
    ('12000000-0000-4000-8000-000000000007',m3,'Prendre une décision avec if','conditions-if','youtube','Utilisez if, elif et else pour exécuter des blocs différents selon une condition.\n\nExercice : indiquez si une personne est mineure, adulte ou senior à partir de son âge.','https://www.youtube.com/watch?v=5pPKYWqkoek','5pPKYWqkoek',600,1,false),
    ('12000000-0000-4000-8000-000000000008',m3,'Répéter avec les boucles','boucles','youtube','Les boucles for et while permettent de répéter une action.\n\nExercice : affichez les nombres de 1 à 20 et marquez les multiples de 3.','https://www.youtube.com/watch?v=LrOAl8vUFHY','LrOAl8vUFHY',660,2,false),
    ('12000000-0000-4000-8000-000000000009',m3,'Projet pratique : jeu de devinette','jeu-devinette','exercise','Construisez un jeu où le programme choisit un nombre secret et guide l’utilisateur avec « trop grand » ou « trop petit ».\n\nObjectifs : while, if/elif/else, compteur de tentatives.',NULL,NULL,1200,3,false)
  ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,content=EXCLUDED.content,youtube_url=EXCLUDED.youtube_url,youtube_video_id=EXCLUDED.youtube_video_id,duration_seconds=EXCLUDED.duration_seconds,position=EXCLUDED.position;

  -- Module 4
  INSERT INTO lessons(id,module_id,title,slug,lesson_type,content,youtube_url,youtube_video_id,duration_seconds,position,is_preview) VALUES
    ('12000000-0000-4000-8000-000000000010',m4,'Créer ses premières fonctions','fonctions','youtube','Une fonction regroupe une logique réutilisable. Apprenez def, les paramètres et return.\n\nExercice : créez calculer_ttc(prix_ht, taux).','https://www.youtube.com/watch?v=nrCAxXfRU28','nrCAxXfRU28',620,1,false),
    ('12000000-0000-4000-8000-000000000011',m4,'Découper son programme','decouper-programme','exercise','Transformez un programme monolithique en petites fonctions : saisir_donnees(), calculer(), afficher_resultat().\n\nCritère de réussite : aucune fonction ne dépasse environ 15 lignes.',NULL,NULL,1000,2,false),
    ('12000000-0000-4000-8000-000000000012',m4,'Modules et paquets','modules-paquets','youtube','Découvrez comment répartir votre code dans plusieurs fichiers et importer des fonctions.','https://www.youtube.com/watch?v=Uei2ILcxuPs','Uei2ILcxuPs',590,3,false)
  ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,content=EXCLUDED.content,youtube_url=EXCLUDED.youtube_url,youtube_video_id=EXCLUDED.youtube_video_id,duration_seconds=EXCLUDED.duration_seconds,position=EXCLUDED.position;

  -- Module 5
  INSERT INTO lessons(id,module_id,title,slug,lesson_type,content,youtube_url,youtube_video_id,duration_seconds,position,is_preview) VALUES
    ('12000000-0000-4000-8000-000000000013',m5,'Listes et collections','collections','youtube','Utilisez les listes pour stocker plusieurs valeurs et découvrez les opérations courantes : append, remove, len et parcours.','https://www.youtube.com/watch?v=beA8IsY3mQs','beA8IsY3mQs',560,1,false),
    ('12000000-0000-4000-8000-000000000014',m5,'Boucler sur une collection','boucler-collection','youtube','Combinez collections et boucles pour transformer et filtrer des données.','https://www.youtube.com/watch?v=rAvD-6MpTw4','rAvD-6MpTw4',610,2,false),
    ('12000000-0000-4000-8000-000000000015',m5,'Mini-projet : gestionnaire de tâches','gestionnaire-taches','exercise','Créez une liste de tâches en mémoire. L’utilisateur peut ajouter, afficher et terminer une tâche.\n\nBonus : sauvegardez les données dans un fichier JSON.',NULL,NULL,1500,3,false)
  ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,content=EXCLUDED.content,youtube_url=EXCLUDED.youtube_url,youtube_video_id=EXCLUDED.youtube_video_id,duration_seconds=EXCLUDED.duration_seconds,position=EXCLUDED.position;

  -- Module 6
  INSERT INTO lessons(id,module_id,title,slug,lesson_type,content,youtube_url,youtube_video_id,duration_seconds,position,is_preview) VALUES
    ('12000000-0000-4000-8000-000000000016',m6,'Choisir et cadrer le projet final','cadrer-projet-final','text','Choisissez un projet simple : gestionnaire de dépenses, quiz, carnet de contacts ou suivi d’habitudes.\n\nÉcrivez : objectif, fonctionnalités indispensables, données à stocker et critères de réussite.',NULL,NULL,900,1,false),
    ('12000000-0000-4000-8000-000000000017',m6,'Construire le projet étape par étape','construire-projet-final','exercise','1. Créez les structures de données.\n2. Ajoutez les fonctions principales.\n3. Gérez les erreurs de saisie.\n4. Testez chaque scénario.\n5. Nettoyez les messages affichés à l’utilisateur.',NULL,NULL,2400,2,false),
    ('12000000-0000-4000-8000-000000000018',m6,'Bilan et prochaines étapes','bilan-prochaines-etapes','youtube','Faites le point sur les compétences acquises puis choisissez une spécialisation : web, data, automatisation ou IA.','https://www.youtube.com/watch?v=rfscVS0vtbw','rfscVS0vtbw',900,3,false)
  ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,content=EXCLUDED.content,youtube_url=EXCLUDED.youtube_url,youtube_video_id=EXCLUDED.youtube_video_id,duration_seconds=EXCLUDED.duration_seconds,position=EXCLUDED.position;

  -- Ressources de leçons : documentation officielle Python et playlist Microsoft.
  INSERT INTO lesson_resources(id,lesson_id,title,resource_type,url,file_name,mime_type) VALUES
    ('13000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001','Guide officiel : commencer avec Python','link','https://www.python.org/about/gettingstarted/',NULL,'text/html'),
    ('13000000-0000-4000-8000-000000000002','12000000-0000-4000-8000-000000000002','Télécharger Python','link','https://www.python.org/downloads/',NULL,'text/html'),
    ('13000000-0000-4000-8000-000000000003','12000000-0000-4000-8000-000000000003','Tutoriel officiel Python','link','https://docs.python.org/3/tutorial/index.html',NULL,'text/html'),
    ('13000000-0000-4000-8000-000000000004','12000000-0000-4000-8000-000000000004','Introduction informelle à Python','link','https://docs.python.org/3/tutorial/introduction.html',NULL,'text/html'),
    ('13000000-0000-4000-8000-000000000005','12000000-0000-4000-8000-000000000007','Outils de contrôle de flux','link','https://docs.python.org/3/tutorial/controlflow.html',NULL,'text/html'),
    ('13000000-0000-4000-8000-000000000006','12000000-0000-4000-8000-000000000013','Structures de données','link','https://docs.python.org/3/tutorial/datastructures.html',NULL,'text/html'),
    ('13000000-0000-4000-8000-000000000007','12000000-0000-4000-8000-000000000012','Modules Python','link','https://docs.python.org/3/tutorial/modules.html',NULL,'text/html'),
    ('13000000-0000-4000-8000-000000000008','12000000-0000-4000-8000-000000000018','Playlist Python for Beginners — Microsoft Developer','link','https://www.youtube.com/playlist?list=PLlrxD0HtieHhS8VzuMCfQD4uJ9yne1mE6',NULL,'text/html')
  ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,url=EXCLUDED.url,resource_type=EXCLUDED.resource_type;

  -- Documents visibles dans la section Ressources du cours.
  INSERT INTO course_files(id,course_id,uploaded_by,title,file_url,file_name,mime_type,file_size) VALUES
    ('14000000-0000-4000-8000-000000000001',v_course,v_author,'Tutoriel officiel Python','https://docs.python.org/3/tutorial/index.html','Tutoriel_officiel_Python.html','text/html',NULL),
    ('14000000-0000-4000-8000-000000000002',v_course,v_author,'Guide officiel pour débuter','https://www.python.org/about/gettingstarted/','Guide_debuter_Python.html','text/html',NULL),
    ('14000000-0000-4000-8000-000000000003',v_course,v_author,'Documentation : structures de données','https://docs.python.org/3/tutorial/datastructures.html','Structures_de_donnees.html','text/html',NULL)
  ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,file_url=EXCLUDED.file_url,file_name=EXCLUDED.file_name,mime_type=EXCLUDED.mime_type;
END $$;

-- Vérification rapide
SELECT c.id, c.title, c.slug, c.status,
  (SELECT COUNT(*) FROM course_modules m WHERE m.course_id=c.id) AS modules,
  (SELECT COUNT(*) FROM lessons l JOIN course_modules m ON m.id=l.module_id WHERE m.course_id=c.id) AS lessons
FROM courses c
WHERE c.slug='python-pour-debutants-complet';
