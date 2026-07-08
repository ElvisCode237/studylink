-- STUDYLINK - MON ESPACE D'ETUDE COMPLET
-- Migration idempotente. Toutes les données sont privées et liées à user_id.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS study_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(120) DEFAULT 'Général',
  color VARCHAR(20) DEFAULT '#1768ff',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  due_at TIMESTAMPTZ,
  estimated_minutes INTEGER NOT NULL DEFAULT 30,
  linked_type VARCHAR(50),
  linked_id UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_planner_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(120) DEFAULT 'Étude',
  color VARCHAR(20) DEFAULT '#1768ff',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  source_type VARCHAR(50) DEFAULT 'manual',
  source_id UUID,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);

CREATE TABLE IF NOT EXISTS study_focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(160) NOT NULL,
  objective TEXT NOT NULL,
  category VARCHAR(120) DEFAULT 'Étude',
  mode VARCHAR(30) NOT NULL DEFAULT '50/10',
  planned_minutes INTEGER NOT NULL DEFAULT 50,
  elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  focus_score INTEGER CHECK (focus_score BETWEEN 1 AND 5),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','abandoned')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_distractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  focus_session_id UUID REFERENCES study_focus_sessions(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category VARCHAR(120) DEFAULT 'Toutes les notes',
  tags TEXT[] NOT NULL DEFAULT '{}',
  favorite BOOLEAN NOT NULL DEFAULT false,
  linked_type VARCHAR(50),
  linked_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(120) DEFAULT 'Apprentissage',
  color VARCHAR(20) DEFAULT '#1768ff',
  icon VARCHAR(60) DEFAULT 'target',
  target_date DATE,
  effort_hours_per_week NUMERIC(5,1) DEFAULT 3,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','paused','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES study_goals(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  position INTEGER NOT NULL DEFAULT 1,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(goal_id, position)
);

CREATE INDEX IF NOT EXISTS idx_study_tasks_user_due ON study_tasks(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_study_events_user_start ON study_planner_events(user_id, start_at);
CREATE INDEX IF NOT EXISTS idx_study_focus_user_start ON study_focus_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_notes_user_updated ON study_notes(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_goals_user_status ON study_goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_study_distractions_user_created ON study_distractions(user_id, created_at DESC);
