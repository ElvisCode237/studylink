-- ============================================================
-- Migration additive : ajoute la messagerie à une base Studylink existante
-- À exécuter dans le SQL Editor de Supabase (une seule fois)
-- ============================================================

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
