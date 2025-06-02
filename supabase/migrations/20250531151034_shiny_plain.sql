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

-- Notification à PostgREST pour recharger le cache du schéma
NOTIFY pgrst, 'reload schema';