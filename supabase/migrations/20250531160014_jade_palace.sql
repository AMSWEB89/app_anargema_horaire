-- Supprimer les anciennes politiques RLS
DROP POLICY IF EXISTS "Les administrateurs peuvent gérer les horaires" ON employee_schedules;
DROP POLICY IF EXISTS "Les utilisateurs peuvent lire les horaires" ON employee_schedules;

-- Créer une nouvelle politique pour les administrateurs
CREATE POLICY "Les administrateurs ont un accès complet"
    ON employee_schedules
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM userapplication
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Créer une politique pour les utilisateurs (lecture et création uniquement)
CREATE POLICY "Les utilisateurs peuvent lire et créer des horaires"
    ON employee_schedules
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Les utilisateurs peuvent créer des horaires"
    ON employee_schedules
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM userapplication
            WHERE id = auth.uid()
            AND (role = 'user' OR role = 'admin')
        )
    );

-- Mettre à jour la fonction de validation des modifications
CREATE OR REPLACE FUNCTION validate_schedule_modifications()
RETURNS TRIGGER AS $$
BEGIN
    -- Pour les mises à jour (UPDATE)
    IF TG_OP = 'UPDATE' THEN
        -- Vérifier si l'utilisateur est admin ou user
        IF NOT EXISTS (
            SELECT 1 FROM userapplication 
            WHERE id = auth.uid()
            AND (role = 'admin' OR role = 'user')
        ) THEN
            RAISE EXCEPTION 'Seuls l''administrateur et l''utilisateur peuvent modifier les horaires.';
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
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Notification à PostgREST pour recharger le cache du schéma
NOTIFY pgrst, 'reload schema';