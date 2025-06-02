-- Suppression de l'ancienne contrainte
ALTER TABLE employee_schedules DROP CONSTRAINT IF EXISTS valid_times;

-- Ajout de la nouvelle contrainte pour la saisie progressive
ALTER TABLE employee_schedules 
ADD CONSTRAINT valid_times CHECK (
    -- Seule l'heure de début est obligatoire à la création
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
);

-- Notification à PostgREST pour recharger le cache du schéma
NOTIFY pgrst, 'reload schema';