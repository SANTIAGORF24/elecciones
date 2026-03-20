-- =====================================================
-- MIGRACION 008: Bloques por poderes en elecciones fijas
-- Permite repetir candidato en bloques distintos (propio + poderes)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'registro_votos_candidatos'
      AND column_name = 'bloque_votacion'
  ) THEN
    ALTER TABLE registro_votos_candidatos
      ADD COLUMN bloque_votacion INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'registro_votos_candidatos_eleccion_id_usuario_id_cargo_id_candidato_id_key'
      AND conrelid = 'public.registro_votos_candidatos'::regclass
  ) THEN
    ALTER TABLE registro_votos_candidatos
      DROP CONSTRAINT registro_votos_candidatos_eleccion_id_usuario_id_cargo_id_candidato_id_key;
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
    ALTER TABLE registro_votos_candidatos
      ADD CONSTRAINT registro_votos_candidatos_bloque_unique
      UNIQUE (eleccion_id, usuario_id, cargo_id, candidato_id, bloque_votacion);
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Migracion 008 aplicada: registro_votos_candidatos ahora usa bloques de votacion.';
END $$;
