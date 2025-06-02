-- Supprimer la table existante et ses dépendances
DROP TABLE IF EXISTS employee_schedules CASCADE;

-- Recréer la table avec les colonnes nullables
CREATE TABLE employee_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  heure_debut time NOT NULL,
  heure_fin time,
  pause_debut time,
  pause_fin time,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_employee_schedule_per_day UNIQUE (employee_id, date),
  CONSTRAINT valid_times CHECK (
    (
      -- Quand heure_fin est présente, vérifier l'ordre
      heure_fin IS NULL OR
      (heure_debut < heure_fin AND
        (
          -- Soit les deux pauses sont NULL
          (pause_debut IS NULL AND pause_fin IS NULL) OR
          -- Soit les deux sont présentes et valides
          (pause_debut IS NOT NULL AND pause_fin IS NOT NULL AND
           pause_debut < pause_fin AND
           pause_debut >= heure_debut AND
           pause_fin <= heure_fin)
        )
      )
    )
  )
);

-- Créer les index pour de meilleures performances
CREATE INDEX idx_employee_schedules_date ON employee_schedules(date);
CREATE INDEX idx_employee_schedules_employee ON employee_schedules(employee_id);

-- Recréer la fonction de déclencheur de présence
CREATE OR REPLACE FUNCTION update_employee_attendance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO employee_attendance (employee_id, date, is_present)
  VALUES (NEW.employee_id, NEW.date, true)
  ON CONFLICT (employee_id, date)
  DO UPDATE SET is_present = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recréer le déclencheur
CREATE TRIGGER employee_schedules_attendance_trigger
AFTER INSERT OR UPDATE ON employee_schedules
FOR EACH ROW
EXECUTE FUNCTION update_employee_attendance();

-- Forcer PostgREST à recharger son cache de schéma
NOTIFY pgrst, 'reload schema';