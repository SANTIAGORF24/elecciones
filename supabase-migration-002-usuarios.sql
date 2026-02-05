-- =====================================================
-- MIGRACIÓN: Crear 20 usuarios de prueba
-- Ejecutar este archivo en Supabase SQL Editor
-- =====================================================
-- Contraseña por defecto para todos: Curador2025
-- Hash bcrypt: $2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe

INSERT INTO usuarios (cedula, nombre_completo, email, password_hash, rol, votos_base, poderes, activo)
VALUES
    ('1001234567', 'Carlos Alberto Rodríguez Pérez', 'carlos.rodriguez@cncu.com', '$2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe', 'votante', 1, 0, true),
    ('1002345678', 'María Fernanda López García', 'maria.lopez@cncu.com', '$2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe', 'votante', 1, 0, true),
    ('1003456789', 'Juan Pablo Martínez Sánchez', 'juan.martinez@cncu.com', '$2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe', 'votante', 1, 0, true),
    ('1004567890', 'Ana María González Ruiz', 'ana.gonzalez@cncu.com', '$2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe', 'votante', 1, 0, true),
    ('1005678901', 'Andrés Felipe Hernández Castro', 'andres.hernandez@cncu.com', '$2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe', 'votante', 1, 0, true),
    ('1006789012', 'Laura Valentina Torres Moreno', 'laura.torres@cncu.com', '$2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe', 'votante', 1, 0, true),
    ('1007890123', 'Diego Alejandro Ramírez Vargas', 'diego.ramirez@cncu.com', '$2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe', 'votante', 1, 0, true),
    ('1008901234', 'Camila Andrea Jiménez Ortiz', 'camila.jimenez@cncu.com', '$2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe', 'votante', 1, 0, true),
    ('1009012345', 'Sebastián Mauricio Díaz Mendoza', 'sebastian.diaz@cncu.com', '$2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe', 'votante', 1, 0, true),
    ('1010123456', 'Valentina Sofía Castro Herrera', 'valentina.castro@cncu.com', '$2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe', 'votante', 1, 0, true),
    ('1011234567', 'Nicolás Eduardo Morales Pineda', 'nicolas.morales@cncu.com', '$2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe', 'votante', 1, 0, true),
    ('1012345678', 'Isabella Mariana Reyes Cardona', 'isabella.reyes@cncu.com', '$2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe', 'votante', 1, 0, true),
    ('1013456789', 'Santiago José Gutiérrez Mejía', 'santiago.gutierrez@cncu.com', '$2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe', 'votante', 1, 0, true),
    ('1014567890', 'Daniela Patricia Vargas Rojas', 'daniela.vargas@cncu.com', '$2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe', 'votante', 1, 0, true),
    ('1015678901', 'Mateo Alejandro Sánchez Duarte', 'mateo.sanchez@cncu.com', '$2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe', 'votante', 1, 0, true),
    ('1016789012', 'Gabriela Lucía Peña Valencia', 'gabriela.pena@cncu.com', '$2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe', 'votante', 1, 0, true),
    ('1017890123', 'Julián David Ospina Cárdenas', 'julian.ospina@cncu.com', '$2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe', 'votante', 1, 0, true),
    ('1018901234', 'Paula Andrea Muñoz Salazar', 'paula.munoz@cncu.com', '$2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe', 'votante', 1, 0, true),
    ('1019012345', 'Alejandro José Ríos Castaño', 'alejandro.rios@cncu.com', '$2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe', 'votante', 1, 0, true),
    ('1020123456', 'Mariana Isabel Acosta Londoño', 'mariana.acosta@cncu.com', '$2b$10$tYISHooYxCK3rJHwAN2gUuEQ/jXxnGAcQ0zcvHq9MkpI0gCAeysRe', 'votante', 1, 0, true)
ON CONFLICT (cedula) DO NOTHING;

-- Mensaje de confirmación
DO $$
DECLARE
    usuarios_creados INTEGER;
BEGIN
    SELECT COUNT(*) INTO usuarios_creados FROM usuarios WHERE cedula LIKE '10%' AND LENGTH(cedula) = 10;
    RAISE NOTICE 'Migración completada: Se crearon % usuarios de prueba', usuarios_creados;
END $$;
