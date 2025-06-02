-- Création de la fonction trigger pour valider la saisie des horaires
CREATE OR REPLACE FUNCTION validate_schedule_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Lors de l'insertion (création)
    IF TG_OP = 'INSERT' THEN
        -- Vérifier si tous les champs horaires sont remplis
        IF NEW.heure_debut IS NOT NULL AND 
           NEW.heure_fin IS NOT NULL AND 
           NEW.pause_debut IS NOT NULL AND 
           NEW.pause_fin IS NOT NULL THEN
            RAISE EXCEPTION 'Seule l''heure de début doit être renseignée lors de la création d''un horaire.';
        END IF;
        
        -- Vérifier que seule l'heure de début est renseignée
        IF NEW.heure_debut IS NULL THEN
            RAISE EXCEPTION 'L''heure de début est obligatoire.';
        END IF;
        
        IF NEW.heure_fin IS NOT NULL OR 
           NEW.pause_debut IS NOT NULL OR 
           NEW.pause_fin IS NOT NULL THEN
            RAISE EXCEPTION 'Seule l''heure de début doit être renseignée lors de la création d''un horaire.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Création du trigger
DROP TRIGGER IF EXISTS validate_schedule_creation_trigger ON employee_schedules;
CREATE TRIGGER validate_schedule_creation_trigger
    BEFORE INSERT ON employee_schedules
    FOR EACH ROW
    EXECUTE FUNCTION validate_schedule_creation();

-- Notification à PostgREST pour recharger le cache du schéma
NOTIFY pgrst, 'reload schema';