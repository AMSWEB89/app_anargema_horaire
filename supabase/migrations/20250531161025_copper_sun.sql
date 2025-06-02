-- Ajout d'une colonne pour désactiver temporairement la validation
ALTER TABLE employee_schedules
ADD COLUMN IF NOT EXISTS validation_disabled boolean DEFAULT false;

-- Mise à jour de la fonction de validation
CREATE OR REPLACE FUNCTION validate_schedule_modifications()
RETURNS TRIGGER AS $$
BEGIN
    -- Ignorer la validation si elle est désactivée
    IF NEW.validation_disabled THEN
        RETURN NEW;
    END IF;

    -- Pour les mises à jour (UPDATE)
    IF TG_OP = 'UPDATE' THEN
        -- Vérifier si l'utilisateur est admin
        IF NOT EXISTS (
            SELECT 1 FROM userapplication 
            WHERE role = 'admin' 
            AND id = auth.uid()
        ) THEN
            RAISE EXCEPTION 'Seul l''administrateur peut modifier les horaires enregistrés.';
        END IF;
    END IF;

    -- Pour les suppressions (DELETE)
    IF TG_OP = 'DELETE' THEN
        -- Vérifier si l'utilisateur est admin
        IF NOT EXISTS (
            SELECT 1 FROM userapplication 
            WHERE role = 'admin' 
            AND id = auth.uid()
        ) THEN
            RAISE EXCEPTION 'Seul l''administrateur peut supprimer les horaires.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Notification à PostgREST pour recharger le cache du schéma
NOTIFY pgrst, 'reload schema';