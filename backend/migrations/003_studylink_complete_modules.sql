-- ============================================================================
-- STUDYLINK 2026 — EXTENSION COMPLETE DE LA BASE SUPABASE
-- Compatible avec le schema existant : users, tutor_profiles, subjects,
-- availability_slots, bookings, reviews, messages, session_materials.
--
-- IMPORTANT : ce projet utilise actuellement une authentification JWT propre
-- avec la table public.users, et non Supabase Auth. Le script NE SUPPRIME RIEN
-- et N'ACTIVE PAS RLS afin de ne pas bloquer le backend Express/Render existant.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------------
-- 0. FONCTION GENERIQUE updated_at
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------------
-- 1. EXTENSIONS DES TABLES EXISTANTES
-- --------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(80);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'fr';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique
  ON users (LOWER(username)) WHERE username IS NOT NULL;

ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}';
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'pending';
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS total_students INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS total_sessions INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS objective TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meeting_url TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(30) NOT NULL DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

DROP TRIGGER IF EXISTS trg_tutor_profiles_updated_at ON tutor_profiles;
CREATE TRIGGER trg_tutor_profiles_updated_at
BEFORE UPDATE ON tutor_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --------------------------------------------------------------------------
-- 2. FICHIERS / PIECES JOINTES DE MESSAGES
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  mime_type VARCHAR(120),
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message
  ON message_attachments(message_id);

-- --------------------------------------------------------------------------
-- 3. NOTIFICATIONS / CENTRE D'ALERTES
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL CHECK (type IN (
    'message','forum','booking','session','bootcamp','course','career',
    'personal_development','entrepreneurship','system'
  )),
  title VARCHAR(255) NOT NULL,
  body TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id, read_at) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  private_messages BOOLEAN NOT NULL DEFAULT true,
  forum_activity BOOLEAN NOT NULL DEFAULT true,
  booking_updates BOOLEAN NOT NULL DEFAULT true,
  bootcamp_updates BOOLEAN NOT NULL DEFAULT true,
  course_updates BOOLEAN NOT NULL DEFAULT true,
  career_updates BOOLEAN NOT NULL DEFAULT true,
  personal_development BOOLEAN NOT NULL DEFAULT true,
  entrepreneurship BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER trg_notification_preferences_updated_at
BEFORE UPDATE ON notification_preferences
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --------------------------------------------------------------------------
-- 4. FORUM COMMUNAUTAIRE
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forum_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(80),
  color VARCHAR(30),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS forum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id INTEGER REFERENCES forum_categories(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','archived')),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_solution BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forum_topic_follows (
  topic_id UUID NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (topic_id, user_id)
);

CREATE TABLE IF NOT EXISTS forum_post_reactions (
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction VARCHAR(30) NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_forum_topics_category_activity
  ON forum_topics(category_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_topic_created
  ON forum_posts(topic_id, created_at);

DROP TRIGGER IF EXISTS trg_forum_topics_updated_at ON forum_topics;
CREATE TRIGGER trg_forum_topics_updated_at
BEFORE UPDATE ON forum_topics
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_forum_posts_updated_at ON forum_posts;
CREATE TRIGGER trg_forum_posts_updated_at
BEFORE UPDATE ON forum_posts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --------------------------------------------------------------------------
-- 5. CATALOGUE DE COURS / TUTORIELS
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning_categories (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES learning_categories(id) ON DELETE SET NULL,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) UNIQUE NOT NULL,
  universe VARCHAR(40) NOT NULL DEFAULT 'academic' CHECK (universe IN (
    'academic','career','personal_development','entrepreneurship'
  )),
  description TEXT,
  icon VARCHAR(80),
  color VARCHAR(30),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES learning_categories(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) UNIQUE NOT NULL,
  short_description TEXT,
  description TEXT,
  cover_url TEXT,
  level VARCHAR(30) NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner','intermediate','advanced','all')),
  language VARCHAR(10) NOT NULL DEFAULT 'fr',
  estimated_minutes INTEGER NOT NULL DEFAULT 0,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT true,
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published','archived')),
  content_type VARCHAR(30) NOT NULL DEFAULT 'course' CHECK (content_type IN ('course','tutorial','career_path','personal_program','entrepreneur_path')),
  objectives TEXT[] DEFAULT '{}',
  prerequisites TEXT[] DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, position)
);

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280),
  lesson_type VARCHAR(30) NOT NULL DEFAULT 'text' CHECK (lesson_type IN (
    'text','youtube','video_upload','pdf','audio','quiz','exercise','live'
  )),
  content TEXT,
  youtube_url TEXT,
  youtube_video_id VARCHAR(30),
  media_url TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 1,
  is_preview BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(module_id, position)
);

CREATE TABLE IF NOT EXISTS lesson_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  resource_type VARCHAR(30) NOT NULL DEFAULT 'file' CHECK (resource_type IN ('file','link','pdf','image','code','other')),
  url TEXT NOT NULL,
  file_name VARCHAR(255),
  mime_type VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','paused','cancelled')),
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  last_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  progress_seconds INTEGER NOT NULL DEFAULT 0,
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (lesson_id, user_id)
);

CREATE TABLE IF NOT EXISTS lesson_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamp_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(30) NOT NULL CHECK (target_type IN ('tutor','course','tutorial','bootcamp','book','resource')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_courses_category_status ON courses(category_id, status);
CREATE INDEX IF NOT EXISTS idx_courses_author ON courses(author_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_course_position ON course_modules(course_id, position);
CREATE INDEX IF NOT EXISTS idx_lessons_module_position ON lessons(module_id, position);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON course_enrollments(user_id, updated_at DESC);

DROP TRIGGER IF EXISTS trg_courses_updated_at ON courses;
CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON courses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_lessons_updated_at ON lessons;
CREATE TRIGGER trg_lessons_updated_at BEFORE UPDATE ON lessons
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_course_enrollments_updated_at ON course_enrollments;
CREATE TRIGGER trg_course_enrollments_updated_at BEFORE UPDATE ON course_enrollments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_lesson_progress_updated_at ON lesson_progress;
CREATE TRIGGER trg_lesson_progress_updated_at BEFORE UPDATE ON lesson_progress
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_lesson_notes_updated_at ON lesson_notes;
CREATE TRIGGER trg_lesson_notes_updated_at BEFORE UPDATE ON lesson_notes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --------------------------------------------------------------------------
-- 6. QUIZ / EXERCICES / CERTIFICATS
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  pass_score NUMERIC(5,2) NOT NULL DEFAULT 70,
  max_attempts INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type VARCHAR(30) NOT NULL DEFAULT 'single_choice' CHECK (question_type IN ('single_choice','multiple_choice','true_false','text')),
  explanation TEXT,
  points NUMERIC(8,2) NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS quiz_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score NUMERIC(5,2),
  passed BOOLEAN,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_id UUID REFERENCES quiz_options(id) ON DELETE SET NULL,
  answer_text TEXT,
  is_correct BOOLEAN,
  UNIQUE(attempt_id, question_id, option_id)
);

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  bootcamp_id UUID,
  certificate_code VARCHAR(80) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  file_url TEXT
);

-- --------------------------------------------------------------------------
-- 7. TUTORIELS ET ETAPES
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES learning_categories(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) UNIQUE NOT NULL,
  description TEXT,
  cover_url TEXT,
  level VARCHAR(30) NOT NULL DEFAULT 'beginner',
  language VARCHAR(10) NOT NULL DEFAULT 'fr',
  estimated_minutes INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tutorial_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutorial_id UUID NOT NULL REFERENCES tutorials(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  youtube_url TEXT,
  youtube_video_id VARCHAR(30),
  image_url TEXT,
  resource_url TEXT,
  estimated_minutes INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 1,
  UNIQUE(tutorial_id, position)
);

CREATE TABLE IF NOT EXISTS tutorial_progress (
  tutorial_id UUID NOT NULL REFERENCES tutorials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 1,
  completed_steps INTEGER[] NOT NULL DEFAULT '{}',
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tutorial_id, user_id)
);

DROP TRIGGER IF EXISTS trg_tutorials_updated_at ON tutorials;
CREATE TRIGGER trg_tutorials_updated_at BEFORE UPDATE ON tutorials
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_tutorial_progress_updated_at ON tutorial_progress;
CREATE TRIGGER trg_tutorial_progress_updated_at BEFORE UPDATE ON tutorial_progress
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --------------------------------------------------------------------------
-- 8. BOOTCAMPS / FORMATIONS GRATUITES
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bootcamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES learning_categories(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) UNIQUE NOT NULL,
  description TEXT,
  cover_url TEXT,
  level VARCHAR(30) NOT NULL DEFAULT 'all',
  language VARCHAR(10) NOT NULL DEFAULT 'fr',
  mode VARCHAR(20) NOT NULL DEFAULT 'online' CHECK (mode IN ('online','in_person','hybrid')),
  location TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  max_participants INTEGER,
  is_free BOOLEAN NOT NULL DEFAULT true,
  status VARCHAR(20) NOT NULL DEFAULT 'project' CHECK (status IN ('project','upcoming','ongoing','completed','cancelled')),
  meeting_url TEXT,
  replay_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bootcamp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bootcamp_id UUID NOT NULL REFERENCES bootcamps(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  meeting_url TEXT,
  replay_url TEXT,
  position INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS bootcamp_registrations (
  bootcamp_id UUID NOT NULL REFERENCES bootcamps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','attended','completed','cancelled','waitlist')),
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (bootcamp_id, user_id)
);

CREATE TABLE IF NOT EXISTS bootcamp_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bootcamp_id UUID NOT NULL REFERENCES bootcamps(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  resource_type VARCHAR(30) NOT NULL DEFAULT 'file',
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bootcamps_status_start ON bootcamps(status, start_at);
CREATE INDEX IF NOT EXISTS idx_bootcamp_registrations_user ON bootcamp_registrations(user_id);

DROP TRIGGER IF EXISTS trg_bootcamps_updated_at ON bootcamps;
CREATE TRIGGER trg_bootcamps_updated_at BEFORE UPDATE ON bootcamps
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Maintenant que bootcamps existe, ajout de la FK certificat si elle n'existe pas encore
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'certificates_bootcamp_id_fkey'
  ) THEN
    ALTER TABLE certificates
      ADD CONSTRAINT certificates_bootcamp_id_fkey
      FOREIGN KEY (bootcamp_id) REFERENCES bootcamps(id) ON DELETE SET NULL;
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 9. PREPARATION CARRIERE / ENTRETIENS
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS career_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  resource_type VARCHAR(40) NOT NULL CHECK (resource_type IN ('cv_template','cover_letter','interview_questions','checklist','video','article','pdf','other')),
  description TEXT,
  url TEXT,
  is_free BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS career_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES tutor_profiles(id) ON DELETE SET NULL,
  session_type VARCHAR(40) NOT NULL CHECK (session_type IN ('mock_interview','cv_review','hr_interview','technical_interview','career_coaching')),
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  strengths TEXT,
  improvements TEXT,
  feedback TEXT,
  score NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_career_sessions_updated_at ON career_sessions;
CREATE TRIGGER trg_career_sessions_updated_at BEFORE UPDATE ON career_sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --------------------------------------------------------------------------
-- 10. DEVELOPPEMENT PERSONNEL : PROGRAMMES, HABITUDES, LIVRES
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS personal_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES learning_categories(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) UNIQUE NOT NULL,
  description TEXT,
  cover_url TEXT,
  duration_days INTEGER NOT NULL DEFAULT 30,
  level VARCHAR(30) NOT NULL DEFAULT 'all',
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS personal_program_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES personal_programs(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_url TEXT,
  youtube_video_id VARCHAR(30),
  UNIQUE(program_id, day_number)
);

CREATE TABLE IF NOT EXISTS personal_program_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_day_id UUID NOT NULL REFERENCES personal_program_days(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS personal_program_enrollments (
  program_id UUID NOT NULL REFERENCES personal_programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_day INTEGER NOT NULL DEFAULT 1,
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (program_id, user_id)
);

CREATE TABLE IF NOT EXISTS personal_task_completions (
  task_id UUID NOT NULL REFERENCES personal_program_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  icon VARCHAR(80),
  color VARCHAR(30),
  frequency VARCHAR(20) NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily','weekdays','weekly','custom')),
  custom_days SMALLINT[] DEFAULT '{}',
  target_per_day INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_count INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (habit_id, log_date)
);

CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  category_id INTEGER REFERENCES learning_categories(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) UNIQUE NOT NULL,
  author_name VARCHAR(255),
  description TEXT,
  cover_url TEXT,
  file_url TEXT,
  audio_url TEXT,
  file_type VARCHAR(20) NOT NULL DEFAULT 'pdf' CHECK (file_type IN ('pdf','epub','audio','external')),
  language VARCHAR(10) NOT NULL DEFAULT 'fr',
  page_count INTEGER,
  is_free BOOLEAN NOT NULL DEFAULT true,
  rights_status VARCHAR(30) NOT NULL DEFAULT 'licensed' CHECK (rights_status IN ('licensed','public_domain','owned','external_link')),
  status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS book_progress (
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_page INTEGER NOT NULL DEFAULT 1,
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  last_position JSONB NOT NULL DEFAULT '{}'::jsonb,
  font_size INTEGER NOT NULL DEFAULT 18,
  night_mode BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (book_id, user_id)
);

CREATE TABLE IF NOT EXISTS book_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_number INTEGER,
  position JSONB NOT NULL DEFAULT '{}'::jsonb,
  label VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS book_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_number INTEGER,
  selected_text TEXT NOT NULL,
  color VARCHAR(30) DEFAULT 'yellow',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS book_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_number INTEGER,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_habits_user_active ON habits(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON habit_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_books_category_status ON books(category_id, status);

DROP TRIGGER IF EXISTS trg_personal_programs_updated_at ON personal_programs;
CREATE TRIGGER trg_personal_programs_updated_at BEFORE UPDATE ON personal_programs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_personal_program_enrollments_updated_at ON personal_program_enrollments;
CREATE TRIGGER trg_personal_program_enrollments_updated_at BEFORE UPDATE ON personal_program_enrollments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_habits_updated_at ON habits;
CREATE TRIGGER trg_habits_updated_at BEFORE UPDATE ON habits
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_books_updated_at ON books;
CREATE TRIGGER trg_books_updated_at BEFORE UPDATE ON books
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_book_progress_updated_at ON book_progress;
CREATE TRIGGER trg_book_progress_updated_at BEFORE UPDATE ON book_progress
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_book_notes_updated_at ON book_notes;
CREATE TRIGGER trg_book_notes_updated_at BEFORE UPDATE ON book_notes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --------------------------------------------------------------------------
-- 11. ENTREPRENEURIAT : PROJETS, TACHES, OBJECTIFS, BUDGET, OUTILS
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entrepreneur_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(280),
  description TEXT,
  problem_statement TEXT,
  target_customer TEXT,
  value_proposition TEXT,
  logo_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'idea' CHECK (status IN ('idea','validation','building','beta','launched','paused','completed')),
  budget_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  launch_date DATE,
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entrepreneur_project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES entrepreneur_projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','cancelled')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_date DATE,
  position INTEGER NOT NULL DEFAULT 1,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entrepreneur_project_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES entrepreneur_projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  target_value NUMERIC(14,2),
  current_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  unit VARCHAR(50),
  due_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entrepreneur_budget_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES entrepreneur_projects(id) ON DELETE CASCADE,
  entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('income','expense','commitment')),
  category VARCHAR(120),
  label VARCHAR(255) NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entrepreneur_project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES entrepreneur_projects(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  file_name VARCHAR(255),
  file_url TEXT NOT NULL,
  file_type VARCHAR(40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entrepreneur_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(80) NOT NULL,
  file_type VARCHAR(20) CHECK (file_type IN ('docx','xlsx','pdf','pptx','link','other')),
  file_url TEXT,
  cover_url TEXT,
  is_free BOOLEAN NOT NULL DEFAULT true,
  download_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_owner_updated ON entrepreneur_projects(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_status ON entrepreneur_project_tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_budget_entries_project_date ON entrepreneur_budget_entries(project_id, entry_date DESC);

DROP TRIGGER IF EXISTS trg_entrepreneur_projects_updated_at ON entrepreneur_projects;
CREATE TRIGGER trg_entrepreneur_projects_updated_at BEFORE UPDATE ON entrepreneur_projects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_entrepreneur_project_tasks_updated_at ON entrepreneur_project_tasks;
CREATE TRIGGER trg_entrepreneur_project_tasks_updated_at BEFORE UPDATE ON entrepreneur_project_tasks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_entrepreneur_project_goals_updated_at ON entrepreneur_project_goals;
CREATE TRIGGER trg_entrepreneur_project_goals_updated_at BEFORE UPDATE ON entrepreneur_project_goals
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_entrepreneur_tools_updated_at ON entrepreneur_tools;
CREATE TRIGGER trg_entrepreneur_tools_updated_at BEFORE UPDATE ON entrepreneur_tools
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --------------------------------------------------------------------------
-- 12. DONNEES DE BASE : CATEGORIES
-- --------------------------------------------------------------------------
INSERT INTO forum_categories (name, slug, description, icon, color, sort_order) VALUES
  ('Python', 'python', 'Programmation Python', 'code', '#2563EB', 10),
  ('Mathématiques', 'mathematiques', 'Questions de mathématiques', 'sigma', '#16A34A', 20),
  ('Intelligence artificielle', 'ia-ml', 'IA et Machine Learning', 'brain', '#7C3AED', 30),
  ('Emploi & Carrière', 'emploi-carriere', 'Entretiens, CV et emploi', 'briefcase', '#EA580C', 40),
  ('Entrepreneuriat', 'entrepreneuriat', 'Business et création de projet', 'rocket', '#F59E0B', 50),
  ('Autres', 'autres', 'Autres sujets', 'message-circle', '#64748B', 99)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO learning_categories (name, slug, universe, icon, color, sort_order) VALUES
  ('Informatique', 'informatique', 'academic', 'code', '#2563EB', 10),
  ('Mathématiques', 'mathematiques', 'academic', 'calculator', '#16A34A', 20),
  ('Physique', 'physique', 'academic', 'atom', '#EA580C', 30),
  ('Langues', 'langues', 'academic', 'globe', '#7C3AED', 40),
  ('Emploi & Carrière', 'emploi-carriere', 'career', 'briefcase', '#EC4899', 50),
  ('Discipline', 'discipline', 'personal_development', 'target', '#2563EB', 100),
  ('Yoga', 'yoga', 'personal_development', 'activity', '#16A34A', 110),
  ('Méditation', 'meditation', 'personal_development', 'flower', '#7C3AED', 120),
  ('Productivité', 'productivite', 'personal_development', 'clipboard-check', '#F59E0B', 130),
  ('Confiance en soi', 'confiance-en-soi', 'personal_development', 'user', '#FB923C', 140),
  ('Habitudes', 'habitudes', 'personal_development', 'refresh-cw', '#0891B2', 150),
  ('Bien-être', 'bien-etre', 'personal_development', 'leaf', '#10B981', 160),
  ('Intelligence émotionnelle', 'intelligence-emotionnelle', 'personal_development', 'heart', '#F43F5E', 170),
  ('Idée & Validation', 'idee-validation', 'entrepreneurship', 'lightbulb', '#F59E0B', 200),
  ('Business Plan', 'business-plan', 'entrepreneurship', 'clipboard', '#2563EB', 210),
  ('Finance', 'finance', 'entrepreneurship', 'pie-chart', '#16A34A', 220),
  ('Marketing', 'marketing', 'entrepreneurship', 'megaphone', '#7C3AED', 230),
  ('Vente', 'vente', 'entrepreneurship', 'shopping-bag', '#EC4899', 240),
  ('E-commerce', 'e-commerce', 'entrepreneurship', 'shopping-cart', '#2563EB', 250),
  ('Leadership', 'leadership', 'entrepreneurship', 'users', '#EA580C', 260),
  ('Business en ligne', 'business-en-ligne', 'entrepreneurship', 'globe', '#0D9488', 270)
ON CONFLICT (slug) DO NOTHING;

-- Outils entrepreneur de demonstration
INSERT INTO entrepreneur_tools (title, slug, description, category, file_type, is_free) VALUES
  ('Modèle de business plan', 'modele-business-plan', 'Structure complète pour présenter votre projet et convaincre vos partenaires.', 'Modèles', 'docx', true),
  ('Prévision financière', 'prevision-financiere', 'Modèle pour estimer vos revenus, charges et rentabilité sur 3 ans.', 'Finances', 'xlsx', true),
  ('Modèle de budget', 'modele-budget', 'Suivez vos dépenses et revenus avec un budget prévisionnel simple.', 'Finances', 'xlsx', true),
  ('Modèle de facture', 'modele-facture', 'Créez des factures professionnelles prêtes à l’emploi.', 'Documents', 'docx', true),
  ('Checklist de lancement', 'checklist-lancement', 'Toutes les étapes clés pour lancer votre projet sans rien oublier.', 'Modèles', 'pdf', true),
  ('Pitch deck', 'pitch-deck', 'Modèle de présentation pour pitcher votre projet.', 'Pitch', 'pptx', true)
ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- ============================================================================
-- FIN DU SCRIPT
-- Verification rapide apres execution :
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' ORDER BY table_name;
-- ============================================================================
