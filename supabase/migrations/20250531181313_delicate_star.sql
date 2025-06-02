-- Fonction pour initialiser les absences quotidiennes
CREATE OR REPLACE FUNCTION initialize_daily_attendance()
RETURNS void AS $$
BEGIN
    -- Étape 1 : Insérer les absences pour les employés sans horaire
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

    -- Étape 2 : Mettre à jour les entrées existantes incorrectes
    UPDATE employee_attendance ea
    SET is_present = false
    FROM employees e
    WHERE ea.employee_id = e.id
    AND ea.date = CURRENT_DATE
    AND NOT EXISTS (
        SELECT 1 
        FROM employee_schedules es 
        WHERE es.employee_id = e.id 
        AND es.date = CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql;

-- Exécuter l'initialisation immédiatement
SELECT initialize_daily_attendance();

-- Créer un trigger pour les nouveaux employés
CREATE OR REPLACE FUNCTION mark_new_employee_absent()
RETURNS TRIGGER AS $$
BEGIN
    -- Marquer le nouvel employé comme absent pour la date actuelle
    INSERT INTO employee_attendance (employee_id, date, is_present)
    VALUES (NEW.id, CURRENT_DATE, false);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur la table employees
DROP TRIGGER IF EXISTS new_employee_absent_trigger ON employees;
CREATE TRIGGER new_employee_absent_trigger
AFTER INSERT ON employees
FOR EACH ROW
EXECUTE FUNCTION mark_new_employee_absent();

-- Notification à PostgREST pour recharger le cache du schéma
NOTIFY pgrst, 'reload schema';