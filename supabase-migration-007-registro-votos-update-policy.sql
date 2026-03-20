-- =====================================================
-- MIGRACION 007: Permitir UPDATE en registro_votos
-- Necesaria para acumular votos_usados por cargo correctamente
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'registro_votos'
      AND policyname = 'Actualizar registro de votos'
  ) THEN
    CREATE POLICY "Actualizar registro de votos" ON registro_votos
      FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Migracion 007 aplicada: policy UPDATE en registro_votos creada.';
END $$;
