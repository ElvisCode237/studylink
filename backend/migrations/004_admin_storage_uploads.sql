-- STUDYLINK — STOCKAGE ADMIN DES FICHIERS
-- À exécuter une fois dans Supabase > SQL Editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Bucket public pour les contenus pédagogiques publiés dans StudyLink.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('studylink-content', 'studylink-content', true, 52428800)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = EXCLUDED.file_size_limit;

-- Fichiers principaux associés à un cours (PDF, DOCX, PPTX, ZIP, audio, vidéo, etc.).
CREATE TABLE IF NOT EXISTS course_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  mime_type VARCHAR(150),
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_files_course ON course_files(course_id, created_at DESC);
