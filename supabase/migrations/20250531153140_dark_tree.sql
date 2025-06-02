-- Création de la fonction trigger pour valider les modifications d'horaires
CREATE OR REPLACE FUNCTION validate_schedule_modifications()
RETURNS TRIGGER AS $$
BEGIN
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

-- Création du trigger pour les modifications
DROP TRIGGER IF EXISTS validate_schedule_modifications_trigger ON employee_schedules;
CREATE TRIGGER validate_schedule_modifications_trigger
    BEFORE UPDATE OR DELETE ON employee_schedules
    FOR EACH ROW
    EXECUTE FUNCTION validate_schedule_modifications();

-- Réactivation de RLS sur la table employee_schedules
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;

-- Création des politiques RLS
DROP POLICY IF EXISTS "Les administrateurs peuvent gérer les horaires" ON employee_schedules;
CREATE POLICY "Les administrateurs peuvent gérer les horaires"
    ON employee_schedules
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM userapplication
            WHERE role = 'admin'
            AND id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Les utilisateurs peuvent lire les horaires" ON employee_schedules;
CREATE POLICY "Les utilisateurs peuvent lire les horaires"
    ON employee_schedules
    FOR SELECT
    TO authenticated
    USING (true);

-- Notification à PostgREST pour recharger le cache du schéma
NOTIFY pgrst, 'reload schema';