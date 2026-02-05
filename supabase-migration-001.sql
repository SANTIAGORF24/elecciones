-- =====================================================
-- MIGRACIÓN: Agregar usuario_id a candidatos
-- Ejecutar este archivo en Supabase SQL Editor
-- =====================================================

-- Agregar columna usuario_id a la tabla candidatos
-- Esto permite vincular un candidato con un usuario registrado
ALTER TABLE candidatos 
ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;

-- Crear índice para búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_candidatos_usuario ON candidatos(usuario_id);

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Migración completada: Se agregó la columna usuario_id a la tabla candidatos';
END $$;
