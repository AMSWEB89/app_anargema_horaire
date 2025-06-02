-- Mise à jour de la fonction de déclencheur pour les présences
CREATE OR REPLACE FUNCTION update_employee_attendance()
RETURNS TRIGGER AS $$
BEGIN
    -- Insertion ou mise à jour de l'enregistrement de présence
    INSERT INTO public.employee_attendance (employee_id, date, is_present)
    VALUES (NEW.employee_id, NEW.date, true)
    ON CONFLICT (employee_id, date)
    DO UPDATE SET is_present = true;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recréer le trigger pour les présences
DROP TRIGGER IF EXISTS employee_schedules_attendance_trigger ON employee_schedules;
CREATE TRIGGER employee_schedules_attendance_trigger
AFTER INSERT OR UPDATE ON employee_schedules
FOR EACH ROW
EXECUTE FUNCTION update_employee_attendance();

-- Fonction pour initialiser les absences quotidiennes
CREATE OR REPLACE FUNCTION initialize_daily_attendance()
RETURNS void AS $$
BEGIN
    -- Insérer les absences pour les employés sans horaire
    INSERT INTO employee_attendance (employee_id, date, is_present)
    SELECT e.id, CURRENT_DATE, false
    FROM employees e
    WHERE NOT EXISTS (
        SELECT 1 
        FROM employee_schedules es 
        WHERE es.employee_id = e.id 
        AND es.date = CURRENT_DATE
    )
    AND NOT EXISTS (
        SELECT 1 
        FROM employee_attendance ea 
        WHERE ea.employee_id = e.id 
        AND ea.date = CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql;

-- Exécuter l'initialisation immédiatement
SELECT initialize_daily_attendance();