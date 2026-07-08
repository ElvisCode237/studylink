# Activation de l’espace Admin StudyLink

1. Exécuter `backend/migrations/003_studylink_complete_modules.sql` dans Supabase SQL Editor.
2. Passer votre compte en admin :
```sql
UPDATE public.users SET role = 'admin' WHERE email = 'VOTRE_EMAIL';
```
3. Redéployer le backend Render puis le frontend Vercel.
4. Se reconnecter et ouvrir `/admin`.

L’espace Admin permet de gérer les cours, modules, leçons YouTube, tutoriels, livres, bootcamps, programmes de développement personnel, outils d’entrepreneuriat et utilisateurs.
