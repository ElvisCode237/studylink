-- ============================================================
-- Studylink — Schéma de base de données PostgreSQL
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- pour gen_random_uuid()

-- ---------- USERS ----------
-- Compte de base : peut être élève, tuteur, ou les deux
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'tutor', 'admin')),
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- TUTOR PROFILES ----------
-- Infos spécifiques aux tuteurs
CREATE TABLE IF NOT EXISTS tutor_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    headline        VARCHAR(255),                 -- ex: "Mathématiques"
    bio             TEXT,
    mastery_level   VARCHAR(50),                  -- ex: "Native Speaker", "Master's Degree"
    hourly_rate     NUMERIC(10,2) NOT NULL DEFAULT 0,
    years_experience INTEGER DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- SUBJECTS ----------
CREATE TABLE IF NOT EXISTS subjects (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) UNIQUE NOT NULL
);

-- Relation many-to-many tuteur <-> matières enseignées
CREATE TABLE IF NOT EXISTS tutor_subjects (
    tutor_id        UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    subject_id      INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (tutor_id, subject_id)
);

-- ---------- AVAILABILITY SLOTS ----------
-- Créneaux proposés par le tuteur (source de vérité du calendrier)
CREATE TABLE IF NOT EXISTS availability_slots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id        UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'busy')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_range CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_slots_tutor_time ON availability_slots(tutor_id, start_time);

-- ---------- BOOKINGS ----------
CREATE TABLE IF NOT EXISTS bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id         UUID NOT NULL REFERENCES availability_slots(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tutor_id        UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    subject_id      INTEGER REFERENCES subjects(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    price           NUMERIC(10,2) NOT NULL,
    room_id         VARCHAR(100),                 -- identifiant de la salle de visio
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_student ON bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tutor ON bookings(tutor_id);

-- ---------- REVIEWS ----------
CREATE TABLE IF NOT EXISTS reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    tutor_id        UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- MESSAGES ----------
-- Messagerie directe entre deux utilisateurs qui ont un contact (via une réservation)
CREATE TABLE IF NOT EXISTS messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT no_self_message CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, read_at);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, recipient_id, created_at);

-- ---------- SESSION MATERIALS ----------
CREATE TABLE IF NOT EXISTS session_materials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    uploaded_by     UUID NOT NULL REFERENCES users(id),
    file_name       VARCHAR(255) NOT NULL,
    file_url        TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- TRIGGER: updated_at auto ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- SEED: matières de base ----------
INSERT INTO subjects (name) VALUES
    ('Mathématiques'), ('Physique'), ('Français'), ('Anglais'),
    ('Chimie'), ('Informatique'), ('Espagnol'), ('Histoire')
ON CONFLICT (name) DO NOTHING;
