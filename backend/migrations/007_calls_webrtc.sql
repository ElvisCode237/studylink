-- StudyLink: appels audio/vidéo et signalisation WebRTC
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id UUID NULL REFERENCES bookings(id) ON DELETE SET NULL,
  call_type VARCHAR(20) NOT NULL DEFAULT 'video' CHECK (call_type IN ('audio','video')),
  status VARCHAR(20) NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing','accepted','rejected','ended','missed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ NULL,
  ended_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_call_sessions_callee_status ON call_sessions(callee_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_sessions_caller_status ON call_sessions(caller_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS call_signals (
  id BIGSERIAL PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  signal_type VARCHAR(20) NOT NULL CHECK (signal_type IN ('offer','answer','ice')),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_signals_call_id_id ON call_signals(call_id, id);
