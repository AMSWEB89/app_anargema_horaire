/*
  # Update employee_schedules table constraints

  1. Changes
    - Make time columns nullable to support step-by-step schedule creation:
      - heure_fin
      - pause_debut
      - pause_fin
    
  2. Reasoning
    - The application uses a step-by-step approach to record schedules
    - Times are recorded progressively throughout the day
    - Initial schedule creation only has heure_debut, other fields are filled later
*/

ALTER TABLE employee_schedules 
  ALTER COLUMN heure_fin DROP NOT NULL,
  ALTER COLUMN pause_debut DROP NOT NULL,
  ALTER COLUMN pause_fin DROP NOT NULL;

-- Update the valid_times constraint to handle NULL values
ALTER TABLE employee_schedules DROP CONSTRAINT valid_times;

ALTER TABLE employee_schedules ADD CONSTRAINT valid_times CHECK (
  (
    -- When all times are present, ensure proper ordering
    (heure_debut < heure_fin) AND
    (
      -- Either both pause times are NULL
      ((pause_debut IS NULL) AND (pause_fin IS NULL)) 
      OR 
      -- Or both are present and valid
      ((pause_debut IS NOT NULL) AND (pause_fin IS NOT NULL) AND 
       (pause_debut < pause_fin) AND 
       (pause_debut >= heure_debut) AND 
       (pause_fin <= heure_fin))
    )
  ) 
  OR 
  -- Allow partial schedule entries
  (heure_fin IS NULL)
);