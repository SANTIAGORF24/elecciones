-- =====================================================
-- MIGRACION 003: Habilitar borrado real (DELETE) para usuarios y elecciones
-- Ejecutar este archivo en Supabase SQL Editor
-- =====================================================

-- 1) Ajustar FKs para que borrar usuario no falle por referencias opcionales
ALTER TABLE IF EXISTS elecciones
DROP CONSTRAINT IF EXISTS elecciones_created_by_fkey;

ALTER TABLE IF EXISTS elecciones
ADD CONSTRAINT elecciones_created_by_fkey
FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS historial_poderes
DROP CONSTRAINT IF EXISTS historial_poderes_asignado_por_fkey;

ALTER TABLE IF EXISTS historial_poderes
ADD CONSTRAINT historial_poderes_asignado_por_fkey
FOREIGN KEY (asignado_por) REFERENCES usuarios(id) ON DELETE SET NULL;

-- 2) Politica DELETE para usuarios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'usuarios'
      AND policyname = 'Solo admin puede eliminar usuarios'
  ) THEN
    CREATE POLICY "Solo admin puede eliminar usuarios" ON usuarios
      FOR DELETE USING (true);
  END IF;
END $$;

-- 3) Politica DELETE para elecciones
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'elecciones'
      AND policyname = 'Solo admin puede eliminar elecciones'
  ) THEN
    CREATE POLICY "Solo admin puede eliminar elecciones" ON elecciones
      FOR DELETE USING (true);
  END IF;
END $$;

-- Mensaje de confirmacion
DO $$
BEGIN
  RAISE NOTICE 'Migracion 003 aplicada: DELETE habilitado para usuarios/elecciones y FKs corregidas.';
END $$;
