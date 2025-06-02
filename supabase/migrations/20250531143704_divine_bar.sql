-- Suppression de la table existante et de ses dépendances
DROP TABLE IF EXISTS public.employee_schedules CASCADE;

-- Création de la table employee_schedules avec heure_fin nullable
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
        heure_fin IS NULL OR
        (
            heure_debut < heure_fin AND
            (
                (pause_debut IS NULL AND pause_fin IS NULL) OR
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
);

-- Création des index pour de meilleures performances
CREATE INDEX IF NOT EXISTS idx_employee_schedules_employee_date 
ON public.employee_schedules(employee_id, date);

CREATE INDEX IF NOT EXISTS idx_employee_schedules_date 
ON public.employee_schedules(date);

-- Désactivation de RLS car non utilisé dans l'application
ALTER TABLE public.employee_schedules DISABLE ROW LEVEL SECURITY;

-- Création de la fonction de déclencheur pour les mises à jour automatiques des présences
CREATE OR REPLACE FUNCTION update_employee_attendance()
RETURNS TRIGGER AS $$
BEGIN
    -- Insertion ou mise à jour de l'enregistrement de présence lors de la création/modification d'un horaire
    INSERT INTO public.employee_attendance (employee_id, date, is_present)
    VALUES (NEW.employee_id, NEW.date, true)
    ON CONFLICT (employee_id, date)
    DO UPDATE SET is_present = true;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Création du déclencheur
CREATE TRIGGER employee_schedules_attendance_trigger
AFTER INSERT OR UPDATE ON public.employee_schedules
FOR EACH ROW
EXECUTE FUNCTION update_employee_attendance();

-- Notification à PostgREST pour recharger le cache du schéma
NOTIFY pgrst, 'reload schema';