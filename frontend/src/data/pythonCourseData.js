export const PYTHON_COURSE_SLUG = 'python-pour-debutants-complet';

const video = (id, title, youtubeId, minutes, content, resources = []) => ({
  id, title, lesson_type: 'youtube', youtube_video_id: youtubeId,
  youtube_url: `https://www.youtube.com/watch?v=${youtubeId}`,
  duration_seconds: minutes * 60, content, resources,
});
const exercise = (id, title, minutes, content) => ({ id, title, lesson_type: 'exercise', duration_seconds: minutes * 60, content, resources: [] });
const text = (id, title, minutes, content) => ({ id, title, lesson_type: 'text', duration_seconds: minutes * 60, content, resources: [] });
const link = (title, url) => ({ id: `${title}-${url}`, title, resource_type: 'link', url });

export const pythonCourseFallback = {
  course: {
    id: PYTHON_COURSE_SLUG,
    slug: PYTHON_COURSE_SLUG,
    title: 'Python pour débutants',
    short_description: 'Apprenez Python pas à pas avec des vidéos, des exercices, des ressources officielles et un projet final.',
    description: 'Un parcours progressif conçu pour les vrais débutants. Vous commencez par installer votre environnement et écrire votre premier programme, puis vous découvrez les variables, les conditions, les boucles, les fonctions, les collections et l’organisation d’un projet Python. Chaque module combine vidéo, explications, pratique et ressources complémentaires.',
    category_name: 'Informatique', level: 'beginner', language: 'fr', estimated_minutes: 390,
    cover_url: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=1600&q=85',
    author_name: 'Équipe StudyLink', enrollment_count: 1248,
    objectives: [
      'Installer Python et préparer un environnement de travail simple',
      'Comprendre la syntaxe, les variables et les types de données',
      'Utiliser les conditions et les boucles pour automatiser des tâches',
      'Créer des fonctions réutilisables et organiser son code',
      'Manipuler listes, dictionnaires et collections',
      'Construire un mini-projet complet et présenter son résultat',
    ],
    prerequisites: ['Aucune expérience en programmation requise', 'Un ordinateur et une connexion Internet'],
  },
  files: [
    { id: 'python-file-1', title: 'Tutoriel officiel Python', file_name: 'Tutoriel_officiel_Python.html', file_url: 'https://docs.python.org/3/tutorial/index.html', mime_type: 'text/html' },
    { id: 'python-file-2', title: 'Guide officiel pour débuter', file_name: 'Guide_debuter_Python.html', file_url: 'https://www.python.org/about/gettingstarted/', mime_type: 'text/html' },
    { id: 'python-file-3', title: 'Structures de données', file_name: 'Structures_de_donnees.html', file_url: 'https://docs.python.org/3/tutorial/datastructures.html', mime_type: 'text/html' },
  ],
  modules: [
    { id: 'py-m1', title: 'Découvrir Python', description: 'Installer les outils et exécuter un premier programme.', lessons: [
      video('py-l1', 'Bienvenue : pourquoi apprendre Python ?', 'jFCNu1-Xdsw', 7, 'Découvrez les usages de Python et définissez votre objectif personnel.\n\nÀ faire : notez une tâche que vous aimeriez automatiser avec Python.', [link('Guide officiel : commencer avec Python', 'https://www.python.org/about/gettingstarted/')]),
      video('py-l2', 'Installer Python et préparer VS Code', 'D2cwvpJSBX4', 12, 'Installez Python, vérifiez python --version, puis préparez un éditeur.\n\nObjectif pratique : créer un dossier studylink-python et un fichier main.py.', [link('Télécharger Python', 'https://www.python.org/downloads/')]),
      video('py-l3', 'Votre premier programme : Hello World', 'wWwr0tDSqnE', 7, 'Écrivez print("Hello, StudyLink !") puis modifiez le texte pour afficher votre prénom et votre objectif.', [link('Tutoriel officiel Python', 'https://docs.python.org/3/tutorial/index.html')]),
    ]},
    { id: 'py-m2', title: 'Variables et types', description: 'Manipuler texte, nombres et conversions.', lessons: [
      video('py-l4', 'Chaînes de caractères', 'tSebLz1hNpA', 9, 'Découvrez les chaînes, la concaténation et len().\n\nExercice : demandez le prénom de l’utilisateur et affichez un message personnalisé.'),
      video('py-l5', 'Nombres et calculs', '5yhn0MFLcu8', 9, 'Découvrez int, float et les opérateurs principaux.\n\nExercice : calculez le prix TTC à partir d’un prix HT.'),
      exercise('py-l6', 'Mini-exercice : convertisseur simple', 15, 'Créez un programme qui demande une température en degrés Celsius et affiche sa conversion en Fahrenheit.\n\nFormule : F = C × 9/5 + 32.'),
    ]},
    { id: 'py-m3', title: 'Conditions et boucles', description: 'Prendre des décisions et automatiser des répétitions.', lessons: [
      video('py-l7', 'Prendre une décision avec if', '5pPKYWqkoek', 10, 'Utilisez if, elif et else.\n\nExercice : indiquez si une personne est mineure, adulte ou senior.', [link('Contrôle de flux — documentation Python', 'https://docs.python.org/3/tutorial/controlflow.html')]),
      video('py-l8', 'Répéter avec les boucles', 'LrOAl8vUFHY', 11, 'Les boucles for et while répètent une action.\n\nExercice : affichez 1 à 20 et marquez les multiples de 3.'),
      exercise('py-l9', 'Projet pratique : jeu de devinette', 20, 'Construisez un jeu où le programme choisit un nombre secret et guide l’utilisateur avec « trop grand » ou « trop petit ».')
    ]},
    { id: 'py-m4', title: 'Fonctions et organisation du code', description: 'Créer des fonctions et organiser plusieurs fichiers.', lessons: [
      video('py-l10', 'Créer ses premières fonctions', 'nrCAxXfRU28', 10, 'Apprenez def, les paramètres et return.\n\nExercice : créez calculer_ttc(prix_ht, taux).'),
      exercise('py-l11', 'Découper son programme', 16, 'Transformez un programme monolithique en petites fonctions : saisir_donnees(), calculer(), afficher_resultat().'),
      video('py-l12', 'Modules et paquets', 'Uei2ILcxuPs', 10, 'Répartissez votre code dans plusieurs fichiers et importez des fonctions.', [link('Modules — documentation Python', 'https://docs.python.org/3/tutorial/modules.html')]),
    ]},
    { id: 'py-m5', title: 'Collections et données', description: 'Manipuler listes, dictionnaires et données structurées.', lessons: [
      video('py-l13', 'Listes et collections', 'beA8IsY3mQs', 9, 'Utilisez les listes pour stocker plusieurs valeurs et découvrez append, remove et len.', [link('Structures de données — documentation Python', 'https://docs.python.org/3/tutorial/datastructures.html')]),
      video('py-l14', 'Boucler sur une collection', 'rAvD-6MpTw4', 10, 'Combinez collections et boucles pour transformer et filtrer des données.'),
      exercise('py-l15', 'Mini-projet : gestionnaire de tâches', 25, 'Créez une liste de tâches en mémoire. L’utilisateur peut ajouter, afficher et terminer une tâche. Bonus : sauvegardez en JSON.'),
    ]},
    { id: 'py-m6', title: 'Projet final', description: 'Assembler les acquis et préparer la suite.', lessons: [
      text('py-l16', 'Choisir et cadrer le projet final', 15, 'Choisissez un projet simple : gestionnaire de dépenses, quiz, carnet de contacts ou suivi d’habitudes. Écrivez l’objectif, les fonctionnalités indispensables et les critères de réussite.'),
      exercise('py-l17', 'Construire le projet étape par étape', 40, '1. Créez les structures de données.\n2. Ajoutez les fonctions principales.\n3. Gérez les erreurs de saisie.\n4. Testez chaque scénario.\n5. Nettoyez les messages affichés.'),
      video('py-l18', 'Bilan et prochaines étapes', 'rfscVS0vtbw', 15, 'Faites le point puis choisissez une spécialisation : web, data, automatisation ou IA.', [link('Playlist Python for Beginners — Microsoft Developer', 'https://www.youtube.com/playlist?list=PLlrxD0HtieHhS8VzuMCfQD4uJ9yne1mE6')]),
    ]},
  ],
};

export function flattenCourseLessons(data = pythonCourseFallback) {
  return (data.modules || []).flatMap((module, moduleIndex) =>
    (module.lessons || []).map((lesson, lessonIndex) => ({ ...lesson, module, moduleIndex, lessonIndex }))
  );
}
