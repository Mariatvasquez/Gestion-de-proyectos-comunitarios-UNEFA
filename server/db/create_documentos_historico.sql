-- Creación de la tabla documentos_historico
CREATE TABLE IF NOT EXISTS documentos_historico (
    id SERIAL PRIMARY KEY,
    proyecto_id INTEGER REFERENCES current_projects(id) ON DELETE CASCADE NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
