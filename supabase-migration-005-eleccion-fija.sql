-- =====================================================
-- MIGRACION 005: Tipo de eleccion fija con votos iguales por cargo
-- =====================================================

-- 1) Agregar columnas nuevas en elecciones
ALTER TABLE IF EXISTS elecciones
ADD COLUMN IF NOT EXISTS tipo VARCHAR(20);

ALTER TABLE IF EXISTS elecciones
ADD COLUMN IF NOT EXISTS votos_fijos_por_cargo INTEGER;

-- 2) Normalizar datos existentes
UPDATE elecciones
SET tipo = 'normal'
WHERE tipo IS NULL;

ALTER TABLE IF EXISTS elecciones
ALTER COLUMN tipo SET DEFAULT 'normal';

ALTER TABLE IF EXISTS elecciones
ALTER COLUMN tipo SET NOT NULL;

-- 3) Constraint para tipo (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'elecciones_tipo_check'
  ) THEN
    ALTER TABLE elecciones
    ADD CONSTRAINT elecciones_tipo_check
    CHECK (tipo IN ('normal', 'fija'));
  END IF;
END $$;

-- 4) Ajustar valores para elecciones fijas existentes (si hubiera)
UPDATE elecciones
SET votos_fijos_por_cargo = 1
WHERE tipo = 'fija'
  AND (votos_fijos_por_cargo IS NULL OR votos_fijos_por_cargo < 1);

-- 5) Constraint de consistencia tipo/votos_fijos_por_cargo (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'elecciones_tipo_votos_fijos_check'
  ) THEN
    ALTER TABLE elecciones
    ADD CONSTRAINT elecciones_tipo_votos_fijos_check
    CHECK (
      (tipo = 'normal' AND votos_fijos_por_cargo IS NULL)
      OR (tipo = 'fija' AND votos_fijos_por_cargo >= 1)
    );
  END IF;
END $$;

COMMENT ON COLUMN elecciones.tipo IS 'Tipo de elección: normal o fija';
COMMENT ON COLUMN elecciones.votos_fijos_por_cargo IS 'En elecciones fijas define votos iguales por cargo para cada participante';

DO $$
BEGIN
  RAISE NOTICE 'Migracion 005 aplicada: tipo de eleccion fija y votos por cargo configurados.';
END $$;
