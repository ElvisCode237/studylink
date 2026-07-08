-- StudyLink — profils utilisateurs enrichis
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city VARCHAR(120);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS country VARCHAR(120);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(20) DEFAULT 'fr';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS timezone VARCHAR(80) DEFAULT 'Europe/Paris';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS occupation VARCHAR(160);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_visibility VARCHAR(20) DEFAULT 'public';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT true;

DO $$ BEGIN
  ALTER TABLE public.users ADD CONSTRAINT users_profile_visibility_check
  CHECK (profile_visibility IN ('public','members','private'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
