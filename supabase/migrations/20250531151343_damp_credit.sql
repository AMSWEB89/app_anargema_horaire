-- Suppression de l'ancienne contrainte
ALTER TABLE employee_schedules DROP CONSTRAINT IF EXISTS valid_times;

-- Ajout de la nouvelle contrainte adaptée à la saisie progressive
ALTER TABLE employee_schedules 
ADD CONSTRAINT valid_times CHECK (
    (heure_fin IS NULL OR heure_debut < heure_fin) AND
    (
        (pause_debut IS NULL AND pause_fin IS NULL) OR 
        (pause_debut IS NOT NULL AND pause_fin IS NULL AND pause_debut >= heure_debut) OR 
        (pause_debut IS NULL AND pause_fin IS NOT NULL AND (heure_fin IS NULL OR pause_fin <= heure_fin)) OR 
        (
            pause_debut IS NOT NULL AND 
            pause_fin IS NOT NULL AND 
            pause_debut < pause_fin AND 
            pause_debut >= heure_debut AND 
            (heure_fin IS NULL OR pause_fin <= heure_fin)
        )
    )
);

-- Création d'une fonction pour définir les pauses par défaut
CREATE OR REPLACE FUNCTION set_default_pause_times()
RETURNS TRIGGER AS $$
BEGIN
    -- Si les pauses sont NULL et que l'heure de fin est définie, mettre les valeurs par défaut
    IF (NEW.pause_debut IS NULL AND NEW.pause_fin IS NULL AND NEW.heure_fin IS NOT NULL) THEN
        NEW.pause_debut := '12:00';
        NEW.pause_fin := '13:00';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Création du trigger pour appliquer les pauses par défaut
DROP TRIGGER IF EXISTS set_default_pause_times_trigger ON employee_schedules;
CREATE TRIGGER set_default_pause_times_trigger
BEFORE INSERT OR UPDATE ON employee_schedules
FOR EACH ROW
EXECUTE FUNCTION set_default_pause_times();

-- Notification à PostgREST pour recharger le cache du schéma
NOTIFY pgrst, 'reload schema';