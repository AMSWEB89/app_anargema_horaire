-- Mise à jour de la fonction d'initialisation des absences
CREATE OR REPLACE FUNCTION initialize_daily_attendance()
RETURNS void AS $$
BEGIN
    -- Insérer des enregistrements d'absence pour tous les employés
    -- qui n'ont pas d'horaire pour la date actuelle
    INSERT INTO employee_attendance (employee_id, date, is_present)
    SELECT e.id, CURRENT_DATE, false
    FROM employees e
    LEFT JOIN employee_schedules es ON e.id = es.employee_id 
        AND es.date = CURRENT_DATE
    WHERE es.id IS NULL
    AND NOT EXISTS (
        SELECT 1 FROM employee_attendance ea
        WHERE ea.employee_id = e.id
        AND ea.date = CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql;

-- Exécuter l'initialisation pour la date actuelle
SELECT initialize_daily_attendance();

-- Créer un trigger pour exécuter l'initialisation chaque jour à minuit
CREATE OR REPLACE FUNCTION trigger_daily_attendance_init()
RETURNS trigger AS $$
BEGIN
    PERFORM initialize_daily_attendance();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Notification à PostgREST pour recharger le cache du schéma
NOTIFY pgrst, 'reload schema';