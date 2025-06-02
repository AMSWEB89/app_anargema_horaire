-- Fonction pour marquer les employés comme absents par défaut
CREATE OR REPLACE FUNCTION mark_employees_absent_for_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Marquer le nouvel employé comme absent pour la date actuelle
    INSERT INTO employee_attendance (employee_id, date, is_present)
    VALUES (NEW.id, CURRENT_DATE, false);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour marquer automatiquement les nouveaux employés comme absents
DROP TRIGGER IF EXISTS mark_new_employee_absent ON employees;
CREATE TRIGGER mark_new_employee_absent
AFTER INSERT ON employees
FOR EACH ROW
EXECUTE FUNCTION mark_employees_absent_for_date();

-- Fonction pour initialiser les absences pour tous les employés
CREATE OR REPLACE FUNCTION initialize_all_employees_attendance()
RETURNS void AS $$
BEGIN
    -- Marquer tous les employés comme absents pour la date actuelle
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

-- Exécuter immédiatement pour initialiser les absences
SELECT initialize_all_employees_attendance();