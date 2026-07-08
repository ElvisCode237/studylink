-- STUDYLINK 009 - Disponibilités et réservation riche
-- Peut être exécutée plusieurs fois.

CREATE INDEX IF NOT EXISTS idx_availability_tutor_status_time
  ON public.availability_slots(tutor_id, status, start_time);

CREATE INDEX IF NOT EXISTS idx_availability_date_status
  ON public.availability_slots((start_time::date), status);

-- Ajoute une semaine de créneaux de démonstration réels uniquement aux tuteurs
-- qui n'ont encore aucun créneau futur. Ces lignes sont de vraies données et
-- deviennent immédiatement réservables dans l'application.
DO $$
DECLARE
  t RECORD;
  d INTEGER;
  h INTEGER;
  start_at TIMESTAMPTZ;
BEGIN
  FOR t IN
    SELECT tp.id
    FROM public.tutor_profiles tp
    WHERE NOT EXISTS (
      SELECT 1 FROM public.availability_slots a
      WHERE a.tutor_id = tp.id AND a.start_time >= now()
    )
  LOOP
    FOR d IN 0..6 LOOP
      FOREACH h IN ARRAY ARRAY[9, 12, 15, 18] LOOP
        start_at := date_trunc('day', now()) + (d || ' days')::interval + (h || ' hours')::interval;
        IF start_at > now() THEN
          INSERT INTO public.availability_slots(tutor_id, start_time, end_time, status)
          VALUES (t.id, start_at, start_at + interval '1 hour',
            CASE WHEN ((d + h) % 7) = 0 THEN 'busy' ELSE 'available' END);
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
