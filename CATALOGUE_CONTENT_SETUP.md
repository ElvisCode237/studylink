# Catalogue complet StudyLink

La page Catalogue contient maintenant 32 cours, soit 4 cours dans chacune des 8 categories principales.

## Installation permanente dans Supabase
1. Ouvrir `backend/migrations/010_full_catalogue_content.sql`.
2. Copier tout le SQL dans Supabase > SQL Editor > New query.
3. Cliquer sur Run.
4. Redeployer Render puis Vercel.

La migration est idempotente et peut etre relancee. Les cartes sont aussi disponibles en mode decouverte dans le frontend afin que la page reste remplie si l API est momentanement indisponible.
