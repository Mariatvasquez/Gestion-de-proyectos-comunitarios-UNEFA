-- Creación de la tabla de planificación de proyectos (Matriz Gantt de 12 semanas)
CREATE TABLE IF NOT EXISTS project_schedules (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES current_projects(id) ON DELETE CASCADE,
    objective TEXT NOT NULL,
    activity TEXT NOT NULL,
    task TEXT NOT NULL,
    start_week INTEGER NOT NULL CHECK (start_week BETWEEN 1 AND 12),
    end_week INTEGER NOT NULL CHECK (end_week BETWEEN 1 AND 12),
    CONSTRAINT check_weeks CHECK (start_week <= end_week)
);
