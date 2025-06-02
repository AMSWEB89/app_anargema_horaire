-- Suppression de la table existante et de ses dépendances
DROP TABLE IF EXISTS public.employee_schedules CASCADE;

-- Création de la table employee_schedules avec les nouvelles contraintes
CREATE TABLE IF NOT EXISTS public.employee_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    date date NOT NULL,
    heure_debut time without time zone NOT NULL,
    heure_fin time without time zone,
    pause_debut time without time zone,
    pause_fin time without time zone,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT unique_employee_schedule_per_day UNIQUE (employee_id, date),
    CONSTRAINT valid_times CHECK (
        -- Seule l'heure de début est obligatoire
        heure_debut IS NOT NULL AND
        (
            -- Cas 1: Uniquement heure de début (création initiale)
            (heure_fin IS NULL AND pause_debut IS NULL AND pause_fin IS NULL)
            OR
            -- Cas 2: Mise à jour avec heure de fin
            (
                heure_fin IS NOT NULL AND 
                heure_debut < heure_fin AND
                (
                    -- Sous-cas 2.1: Pas de pauses
                    (pause_debut IS NULL AND pause_fin IS NULL)
                    OR
                    -- Sous-cas 2.2: Les deux pauses sont renseignées
                    (
                        pause_debut IS NOT NULL AND 
                        pause_fin IS NOT NULL AND 
                        pause_debut < pause_fin AND
                        pause_debut >= heure_debut AND
                        pause_fin <= heure_fin
                    )
                )
            )
        )
    )
);

-- Création des index pour de meilleures performances
CREATE INDEX IF NOT EXISTS idx_employee_schedules_employee_date 
ON public.employee_schedules(employee_id, date);

CREATE INDEX IF NOT EXISTS idx_employee_schedules_date 
ON public.employee_schedules(date);

-- Création de la fonction trigger pour valider la saisie des horaires
CREATE OR REPLACE FUNCTION validate_schedule_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Lors de l'insertion (création)
    IF TG_OP = 'INSERT' THEN
        -- Vérifier que seule l'heure de début est renseignée
        IF NEW.heure_debut IS NULL THEN
            RAISE EXCEPTION 'L''heure de début est obligatoire.';
        END IF;
        
        -- Vérifier qu'aucun autre champ horaire n'est rempli
        IF NEW.heure_fin IS NOT NULL OR 
           NEW.pause_debut IS NOT NULL OR 
           NEW.pause_fin IS NOT NULL THEN
            RAISE EXCEPTION 'Seule l''heure de début doit être renseignée lors de la création d''un horaire.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Création du trigger pour la validation
CREATE TRIGGER validate_schedule_creation_trigger
    BEFORE INSERT ON employee_schedules
    FOR EACH ROW
    EXECUTE FUNCTION validate_schedule_creation();

-- Création de la fonction de déclencheur pour les mises à jour automatiques des présences
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

-- Création du trigger pour les présences
CREATE TRIGGER employee_schedules_attendance_trigger
AFTER INSERT OR UPDATE ON public.employee_schedules
FOR EACH ROW
EXECUTE FUNCTION update_employee_attendance();

-- Désactivation de RLS car non utilisé dans l'application
ALTER TABLE public.employee_schedules DISABLE ROW LEVEL SECURITY;

-- Notification à PostgREST pour recharger le cache du schéma
NOTIFY pgrst, 'reload schema';