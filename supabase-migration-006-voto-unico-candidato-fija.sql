-- =====================================================
-- MIGRACION 006: Bloquear voto duplicado por candidato en eleccion fija
-- =====================================================

CREATE TABLE IF NOT EXISTS registro_votos_candidatos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  eleccion_id UUID REFERENCES elecciones(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  cargo_id UUID REFERENCES cargos(id) ON DELETE CASCADE,
  candidato_id UUID REFERENCES candidatos(id) ON DELETE CASCADE,
  cantidad INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(eleccion_id, usuario_id, cargo_id, candidato_id)
);

CREATE INDEX IF NOT EXISTS idx_registro_votos_candidatos_eleccion
  ON registro_votos_candidatos(eleccion_id);

CREATE INDEX IF NOT EXISTS idx_registro_votos_candidatos_usuario
  ON registro_votos_candidatos(usuario_id);

CREATE INDEX IF NOT EXISTS idx_registro_votos_candidatos_cargo
  ON registro_votos_candidatos(cargo_id);

ALTER TABLE registro_votos_candidatos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'registro_votos_candidatos'
      AND policyname = 'Ver registro por candidato'
  ) THEN
    CREATE POLICY "Ver registro por candidato" ON registro_votos_candidatos
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'registro_votos_candidatos'
      AND policyname = 'Insertar registro por candidato'
  ) THEN
    CREATE POLICY "Insertar registro por candidato" ON registro_votos_candidatos
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE registro_votos_candidatos IS 'Registro por candidato para prevenir voto duplicado al mismo candidato';

DO $$
BEGIN
  RAISE NOTICE 'Migracion 006 aplicada: voto unico por candidato (eleccion fija) listo.';
END $$;
