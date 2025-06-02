-- Fonction pour marquer les employés comme absents par défaut
CREATE OR REPLACE FUNCTION mark_employees_absent_for_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Marquer tous les employés comme absents pour la date actuelle s'ils n'ont pas déjà un statut
    INSERT INTO employee_attendance (employee_id, date, is_present)
    SELECT id, CURRENT_DATE, false
    FROM employees
    WHERE NOT EXISTS (
        SELECT 1 FROM employee_attendance
        WHERE employee_id = employees.id
        AND date = CURRENT_DATE
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Créer un trigger qui s'exécute une fois par jour
CREATE OR REPLACE FUNCTION create_daily_attendance_records()
RETURNS void AS $$
BEGIN
    -- Marquer tous les employés comme absents pour la date actuelle s'ils n'ont pas déjà un statut
    INSERT INTO employee_attendance (employee_id, date, is_present)
    SELECT e.id, CURRENT_DATE, false
    FROM employees e
    WHERE NOT EXISTS (
        SELECT 1 FROM employee_attendance ea
        WHERE ea.employee_id = e.id
        AND ea.date = CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql;

-- Exécuter la fonction immédiatement pour initialiser les présences du jour
SELECT create_daily_attendance_records();