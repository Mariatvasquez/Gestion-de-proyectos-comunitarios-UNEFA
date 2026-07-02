-- Script de Base de Datos para el Sistema de Control de Servicio Comunitario de la UNEFA
-- Compatibilidad: PostgreSQL 17

-- Limpieza previa para reinicio de base de datos
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS historical_projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS current_projects CASCADE;
DROP TYPE IF EXISTS tutor_enum CASCADE;

-- 0. Tabla de Proyectos Actuales (Comunitarios activos)
CREATE TABLE current_projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    community_name VARCHAR(255) NOT NULL
);

-- 0.5. Tipo ENUM para tipo de tutor
CREATE TYPE tutor_enum AS ENUM ('académico', 'institucional');

-- 1. Tabla de Usuarios (Estudiantes, Tutores y Coordinadores)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    identification VARCHAR(20) UNIQUE NOT NULL, -- Cédula
    major VARCHAR(50) NOT NULL,                  -- Carrera
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'tutor', 'coordinator')),
    password_hash VARCHAR(255) NOT NULL,        -- Contraseña hasheada (bcrypt)
    active BOOLEAN DEFAULT TRUE,
    tutor_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Tutor asignado al estudiante
    project_id INTEGER REFERENCES current_projects(id) ON DELETE SET NULL, -- Proyecto actual asignado
    docs_submitted BOOLEAN DEFAULT FALSE,       -- Control de entrega de documentos
    tutor_type tutor_enum,                      -- Tipo de tutor
    phone VARCHAR(20),                          -- Teléfono de contacto
    email VARCHAR(100),                         -- Correo electrónico
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Bitácoras de Actividades
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    activity_date DATE NOT NULL,
    hours_spent INTEGER NOT NULL CHECK (hours_spent BETWEEN 1 AND 8),
    description TEXT NOT NULL,
    physical_attendance BOOLEAN DEFAULT FALSE,
    spokesperson_name VARCHAR(100) NOT NULL,       -- Aval Comunitario: Vocero
    spokesperson_phone VARCHAR(20) NOT NULL,      -- Aval Comunitario: Teléfono
    sworn_statement BOOLEAN NOT NULL CHECK (sworn_statement = TRUE), -- Declaración jurada
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'correct')),
    feedback_comment TEXT,                        -- Comentarios de corrección del tutor
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla del Cronograma Académico (Hitos)
CREATE TABLE milestones (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    event_date DATE NOT NULL,
    project_id INTEGER REFERENCES current_projects(id) ON DELETE CASCADE, -- Hito por proyecto
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla del Repositorio de Proyectos Históricos
CREATE TABLE historical_projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    community VARCHAR(150) NOT NULL,
    major VARCHAR(100) NOT NULL,
    summary TEXT,
    academic_year INTEGER NOT NULL
);

-- Insertar Datos Semilla Iniciales
-- Todos los usuarios iniciales tienen la contraseña por defecto: unefa123
-- Hash: $2b$10$hSMvAg7ZkTP2d5hKKmay/O6DjtsfqJZd0cpvgM.lGVqllfsuo7In6

-- Insertar Proyectos Actuales iniciales
INSERT INTO current_projects (title, community_name) VALUES
('Desarrollo de Portal Web Comunitario', 'Consejo Comunal Sector Central'),
('Sistema de Inventario para Ambulatorio', 'Ambulatorio Barrio Adentro Las Flores');

INSERT INTO users (name, identification, major, role, password_hash, tutor_id, project_id, docs_submitted, tutor_type) VALUES
('Prof. Rosa Camejo', 'V-10203040', 'Administración', 'coordinator', '$2b$10$hSMvAg7ZkTP2d5hKKmay/O6DjtsfqJZd0cpvgM.lGVqllfsuo7In6', NULL, NULL, FALSE, NULL),
('Prof. Carlos Mendoza', 'V-8765432', 'Ingeniería de Sistemas', 'tutor', '$2b$10$hSMvAg7ZkTP2d5hKKmay/O6DjtsfqJZd0cpvgM.lGVqllfsuo7In6', NULL, NULL, FALSE, 'académico'),
('Ana Gómez', 'V-25123456', 'Ingeniería de Sistemas', 'student', '$2b$10$hSMvAg7ZkTP2d5hKKmay/O6DjtsfqJZd0cpvgM.lGVqllfsuo7In6', 2, 1, FALSE, NULL),
('Luis Torres', 'V-26789123', 'Ingeniería de Sistemas', 'student', '$2b$10$hSMvAg7ZkTP2d5hKKmay/O6DjtsfqJZd0cpvgM.lGVqllfsuo7In6', 2, 1, TRUE, NULL);

-- Insertar actividades iniciales para tener un historial de pruebas
INSERT INTO activities (student_id, activity_date, hours_spent, description, physical_attendance, spokesperson_name, spokesperson_phone, sworn_statement, status, feedback_comment) VALUES
(3, '2026-05-20', 6, 'Reunión diagnóstica con la comunidad y levantamiento de requerimientos de software.', TRUE, 'Carmen Silva', '0414-1234567', TRUE, 'approved', 'Excelente inicio de proyecto.'),
(3, '2026-05-22', 4, 'Diseño de la arquitectura de la base de datos y mockups iniciales del sistema.', FALSE, 'Carmen Silva', '0414-1234567', TRUE, 'pending', NULL),
(4, '2026-05-24', 8, 'Desarrollo de pantallas del módulo de administración de usuarios.', TRUE, 'Jesús Pérez', '0412-9876543', TRUE, 'correct', 'Por favor, detalla más las actividades realizadas presencialmente.');

-- Insertar hitos académicos con project_id opcional
INSERT INTO milestones (title, event_date, project_id) VALUES
('Taller de Inducción de Servicio Comunitario', '2026-06-05', NULL),
('Entrega del Primer Avance de Bitácoras', '2026-06-25', 1),
('Entrega de Informe Final Firmado', '2026-07-20', 1);

-- Insertar proyectos históricos
INSERT INTO historical_projects (title, community, major, summary, academic_year) VALUES
('Sistema de Automatización para el Consultorio Barrio Adentro', 'Comunidad Sector 3, San Fernando', 'Ingeniería de Sistemas', 'Desarrollo de un sistema web local para la gestión de historias clínicas y control de vacunas.', 2025),
('Plan de Alfabetización Tecnológica para el Adulto Mayor', 'Consejo Comunal Las Flores', 'Ingeniería de Sistemas', 'Capacitación interactiva en el uso de smartphones y computadoras básicas para la comunicación vecinal.', 2025),
('Diseño de Red de Datos Comunitaria para Escuela Primaria', 'Escuela Bolivariana Carabobo', 'Ingeniería de Sistemas', 'Propuesta de cableado estructurado e instalación de puntos de acceso Wi-Fi para laboratorios educativos.', 2024);

