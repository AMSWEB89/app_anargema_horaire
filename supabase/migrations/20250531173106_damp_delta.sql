-- Fonction pour initialiser les absences quotidiennes
CREATE OR REPLACE FUNCTION initialize_daily_attendance()
RETURNS void AS $$
BEGIN
    -- Insérer des enregistrements d'absence pour tous les employés
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

-- Fonction pour marquer un nouvel employé comme absent
CREATE OR REPLACE FUNCTION mark_new_employee_absent()
RETURNS TRIGGER AS $$
BEGIN
    -- Marquer le nouvel employé comme absent pour la date actuelle
    INSERT INTO employee_attendance (employee_id, date, is_present)
    VALUES (NEW.id, CURRENT_DATE, false);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour marquer les nouveaux employés comme absents
DROP TRIGGER IF EXISTS new_employee_absent_trigger ON employees;
CREATE TRIGGER new_employee_absent_trigger
AFTER INSERT ON employees
FOR EACH ROW
EXECUTE FUNCTION mark_new_employee_absent();

-- Fonction pour marquer les absences pour une date spécifique
CREATE OR REPLACE FUNCTION mark_absences_for_date(target_date date)
RETURNS void AS $$
BEGIN
    -- Insérer des enregistrements d'absence pour tous les employés qui n'ont pas d'horaire
    INSERT INTO employee_attendance (employee_id, date, is_present)
    SELECT e.id, target_date, false
    FROM employees e
    WHERE NOT EXISTS (
        SELECT 1 FROM employee_schedules es
        WHERE es.employee_id = e.id
        AND es.date = target_date
    )
    AND NOT EXISTS (
        SELECT 1 FROM employee_attendance ea
        WHERE ea.employee_id = e.id
        AND ea.date = target_date
    );
END;
$$ LANGUAGE plpgsql;

-- Exécuter l'initialisation pour la date actuelle
SELECT initialize_daily_attendance();