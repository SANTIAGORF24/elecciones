-- =====================================================
-- MIGRACION 004: Usuarios permitidos por eleccion
-- Ejecutar este archivo en Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS eleccion_usuarios_permitidos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  eleccion_id UUID NOT NULL REFERENCES elecciones(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(eleccion_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_eleccion_usuarios_permitidos_eleccion
  ON eleccion_usuarios_permitidos(eleccion_id);

CREATE INDEX IF NOT EXISTS idx_eleccion_usuarios_permitidos_usuario
  ON eleccion_usuarios_permitidos(usuario_id);

ALTER TABLE eleccion_usuarios_permitidos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'eleccion_usuarios_permitidos'
      AND policyname = 'Ver usuarios permitidos por eleccion'
  ) THEN
    CREATE POLICY "Ver usuarios permitidos por eleccion" ON eleccion_usuarios_permitidos
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'eleccion_usuarios_permitidos'
      AND policyname = 'Gestionar usuarios permitidos por eleccion'
  ) THEN
    CREATE POLICY "Gestionar usuarios permitidos por eleccion" ON eleccion_usuarios_permitidos
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Migracion 004 aplicada: tabla eleccion_usuarios_permitidos lista.';
END $$;
