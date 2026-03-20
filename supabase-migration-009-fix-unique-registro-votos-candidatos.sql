-- =====================================================
-- MIGRACION 009: Corregir unique vieja en registro_votos_candidatos
-- Soluciona conflicto al votar en bloques de poderes (eleccion fija)
-- =====================================================

DO $$
DECLARE
  c RECORD;
BEGIN
  -- Elimina cualquier unique vieja sobre (eleccion_id, usuario_id, cargo_id, candidato_id)
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = 'public.registro_votos_candidatos'::regclass
      AND con.contype = 'u'
      AND pg_get_constraintdef(con.oid) ILIKE 'UNIQUE (eleccion_id, usuario_id, cargo_id, candidato_id)%'
      AND con.conname <> 'registro_votos_candidatos_bloque_unique'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.registro_votos_candidatos DROP CONSTRAINT %I',
      c.conname
    );
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'registro_votos_candidatos'
      AND column_name = 'bloque_votacion'
  ) THEN
    ALTER TABLE public.registro_votos_candidatos
      ADD COLUMN bloque_votacion INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'registro_votos_candidatos_bloque_unique'
      AND conrelid = 'public.registro_votos_candidatos'::regclass
  ) THEN
    ALTER TABLE public.registro_votos_candidatos
      ADD CONSTRAINT registro_votos_candidatos_bloque_unique
      UNIQUE (eleccion_id, usuario_id, cargo_id, candidato_id, bloque_votacion);
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Migracion 009 aplicada: unique por bloque activa en registro_votos_candidatos.';
END $$;
