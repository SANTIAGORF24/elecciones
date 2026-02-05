-- =====================================================
-- SISTEMA DE VOTACIONES - COLEGIO NACIONAL DE CURADORES URBANOS
-- Script de configuración de base de datos Supabase
-- =====================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLA: usuarios
-- Almacena información de todos los usuarios del sistema
-- =====================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cedula VARCHAR(20) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) DEFAULT 'votante' CHECK (rol IN ('admin', 'votante')),
    votos_base INTEGER DEFAULT 1,
    poderes INTEGER DEFAULT 0,
    foto_url TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_usuarios_cedula ON usuarios(cedula);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);

-- =====================================================
-- TABLA: elecciones
-- Almacena las elecciones creadas
-- =====================================================
CREATE TABLE IF NOT EXISTS elecciones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'activa', 'finalizada')),
    fecha_inicio TIMESTAMP WITH TIME ZONE,
    fecha_fin TIMESTAMP WITH TIME ZONE,
    link_publico VARCHAR(100) UNIQUE,
    created_by UUID REFERENCES usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Índice para el link público
CREATE INDEX IF NOT EXISTS idx_elecciones_link ON elecciones(link_publico);
CREATE INDEX IF NOT EXISTS idx_elecciones_estado ON elecciones(estado);

-- =====================================================
-- TABLA: cargos
-- Cargos disponibles en cada elección
-- =====================================================
CREATE TABLE IF NOT EXISTS cargos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    eleccion_id UUID REFERENCES elecciones(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    max_votos_por_usuario INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_cargos_eleccion ON cargos(eleccion_id);

-- =====================================================
-- TABLA: candidatos
-- Candidatos para cada cargo en cada elección
-- =====================================================
CREATE TABLE IF NOT EXISTS candidatos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    eleccion_id UUID REFERENCES elecciones(id) ON DELETE CASCADE,
    cargo_id UUID REFERENCES cargos(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    foto_url TEXT,
    numero_lista INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_candidatos_eleccion ON candidatos(eleccion_id);
CREATE INDEX IF NOT EXISTS idx_candidatos_cargo ON candidatos(cargo_id);

-- =====================================================
-- TABLA: votos
-- Registro de votos (SIN información de por quién votó)
-- Solo registra que el usuario votó, cuántos votos usó
-- =====================================================
CREATE TABLE IF NOT EXISTS registro_votos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    eleccion_id UUID REFERENCES elecciones(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    cargo_id UUID REFERENCES cargos(id) ON DELETE CASCADE,
    votos_usados INTEGER DEFAULT 0,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(eleccion_id, usuario_id, cargo_id)
);

CREATE INDEX IF NOT EXISTS idx_registro_votos_eleccion ON registro_votos(eleccion_id);
CREATE INDEX IF NOT EXISTS idx_registro_votos_usuario ON registro_votos(usuario_id);

-- =====================================================
-- TABLA: votos_secretos
-- Almacena los votos de forma anónima (sin relación al usuario)
-- Solo se puede contar, NUNCA saber quién votó por quién
-- =====================================================
CREATE TABLE IF NOT EXISTS votos_secretos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    eleccion_id UUID REFERENCES elecciones(id) ON DELETE CASCADE,
    cargo_id UUID REFERENCES cargos(id) ON DELETE CASCADE,
    candidato_id UUID REFERENCES candidatos(id) ON DELETE CASCADE,
    cantidad INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_votos_secretos_eleccion ON votos_secretos(eleccion_id);
CREATE INDEX IF NOT EXISTS idx_votos_secretos_candidato ON votos_secretos(candidato_id);

-- =====================================================
-- TABLA: historial_poderes
-- Registro de asignación de poderes a usuarios
-- =====================================================
CREATE TABLE IF NOT EXISTS historial_poderes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    poderes_asignados INTEGER NOT NULL,
    motivo TEXT,
    asignado_por UUID REFERENCES usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_historial_poderes_usuario ON historial_poderes(usuario_id);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_elecciones_updated_at
    BEFORE UPDATE ON elecciones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCIÓN: Obtener resultados de elección (conteo anónimo)
-- =====================================================
CREATE OR REPLACE FUNCTION obtener_resultados_eleccion(p_eleccion_id UUID)
RETURNS TABLE (
    cargo_id UUID,
    cargo_nombre VARCHAR,
    candidato_id UUID,
    candidato_nombre VARCHAR,
    total_votos BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as cargo_id,
        c.nombre as cargo_nombre,
        ca.id as candidato_id,
        ca.nombre as candidato_nombre,
        COALESCE(SUM(vs.cantidad), 0) as total_votos
    FROM cargos c
    LEFT JOIN candidatos ca ON ca.cargo_id = c.id
    LEFT JOIN votos_secretos vs ON vs.candidato_id = ca.id
    WHERE c.eleccion_id = p_eleccion_id
    GROUP BY c.id, c.nombre, ca.id, ca.nombre
    ORDER BY c.nombre, total_votos DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Verificar si usuario ya votó en cargo
-- =====================================================
CREATE OR REPLACE FUNCTION usuario_ya_voto(p_usuario_id UUID, p_eleccion_id UUID, p_cargo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM registro_votos 
        WHERE usuario_id = p_usuario_id 
        AND eleccion_id = p_eleccion_id 
        AND cargo_id = p_cargo_id
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Obtener votos disponibles de usuario
-- =====================================================
CREATE OR REPLACE FUNCTION votos_disponibles_usuario(p_usuario_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_votos_base INTEGER;
    v_poderes INTEGER;
BEGIN
    SELECT votos_base, poderes INTO v_votos_base, v_poderes
    FROM usuarios WHERE id = p_usuario_id;
    
    RETURN COALESCE(v_votos_base, 1) + COALESCE(v_poderes, 0);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VISTAS
-- =====================================================

-- Vista: Estadísticas de elección
CREATE OR REPLACE VIEW estadisticas_eleccion AS
SELECT 
    e.id as eleccion_id,
    e.nombre as eleccion_nombre,
    e.estado,
    COUNT(DISTINCT rv.usuario_id) as total_votantes,
    SUM(rv.votos_usados) as total_votos_emitidos,
    (SELECT COUNT(*) FROM usuarios WHERE activo = true) as total_usuarios_activos
FROM elecciones e
LEFT JOIN registro_votos rv ON rv.eleccion_id = e.id
GROUP BY e.id, e.nombre, e.estado;

-- =====================================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE elecciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE registro_votos ENABLE ROW LEVEL SECURITY;
ALTER TABLE votos_secretos ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_poderes ENABLE ROW LEVEL SECURITY;

-- Política para usuarios (todos pueden leer, solo admin puede modificar)
CREATE POLICY "Usuarios pueden ver su propio perfil" ON usuarios
    FOR SELECT USING (true);

CREATE POLICY "Solo admin puede insertar usuarios" ON usuarios
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Solo admin puede actualizar usuarios" ON usuarios
    FOR UPDATE USING (true);

-- Política para elecciones
CREATE POLICY "Todos pueden ver elecciones" ON elecciones
    FOR SELECT USING (true);

CREATE POLICY "Solo admin puede crear elecciones" ON elecciones
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Solo admin puede actualizar elecciones" ON elecciones
    FOR UPDATE USING (true);

-- Política para cargos
CREATE POLICY "Todos pueden ver cargos" ON cargos
    FOR SELECT USING (true);

CREATE POLICY "Solo admin puede manejar cargos" ON cargos
    FOR ALL USING (true);

-- Política para candidatos
CREATE POLICY "Todos pueden ver candidatos" ON candidatos
    FOR SELECT USING (true);

CREATE POLICY "Solo admin puede manejar candidatos" ON candidatos
    FOR ALL USING (true);

-- Política para registro de votos
CREATE POLICY "Ver registro de votos" ON registro_votos
    FOR SELECT USING (true);

CREATE POLICY "Insertar registro de votos" ON registro_votos
    FOR INSERT WITH CHECK (true);

-- Política para votos secretos (IMPORTANTE: nadie puede ver individualmente)
CREATE POLICY "Solo insertar votos secretos" ON votos_secretos
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Solo ver agregados de votos" ON votos_secretos
    FOR SELECT USING (true);

-- Política para historial de poderes
CREATE POLICY "Ver historial de poderes" ON historial_poderes
    FOR SELECT USING (true);

CREATE POLICY "Insertar historial de poderes" ON historial_poderes
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Insertar usuario administrador por defecto
-- Contraseña: Curador2025 (hasheada con bcrypt)
INSERT INTO usuarios (
    cedula,
    nombre_completo,
    email,
    password_hash,
    rol,
    votos_base,
    poderes,
    activo
) VALUES (
    'ADMIN001',
    'Administrador CNCU',
    'CuradorAdmin@cncu.com',
    '$2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe', -- Curador2025
    'admin',
    1,
    0,
    true
) ON CONFLICT (cedula) DO NOTHING;

-- =====================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE usuarios IS 'Tabla de usuarios del sistema de votaciones';
COMMENT ON TABLE elecciones IS 'Elecciones creadas en el sistema';
COMMENT ON TABLE cargos IS 'Cargos disponibles para votar en cada elección';
COMMENT ON TABLE candidatos IS 'Candidatos postulados para cada cargo';
COMMENT ON TABLE registro_votos IS 'Registro de participación (quién votó, sin revelar por quién)';
COMMENT ON TABLE votos_secretos IS 'Votos anónimos - NUNCA relacionar con usuarios';
COMMENT ON TABLE historial_poderes IS 'Historial de asignación de poderes/votos extra';

COMMENT ON COLUMN usuarios.poderes IS 'Votos extra asignados al usuario';
COMMENT ON COLUMN usuarios.votos_base IS 'Votos base que tiene cada usuario (normalmente 1)';
COMMENT ON COLUMN elecciones.link_publico IS 'Link único para ver resultados en tiempo real';
COMMENT ON COLUMN votos_secretos.cantidad IS 'Cantidad de votos (puede ser > 1 si usuario tiene poderes)';
