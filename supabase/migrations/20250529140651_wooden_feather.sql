/*
  # Create employee schedules table

  1. New Tables
    - `employee_schedules`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key to employees.id)
      - `date` (date)
      - `heure_debut` (time)
      - `heure_fin` (time)
      - `pause_debut` (time, nullable)
      - `pause_fin` (time, nullable)
      - `created_at` (timestamptz)

  2. Constraints
    - Primary key on `id`
    - Foreign key from `employee_id` to `employees.id`
    - Unique constraint on `employee_id` and `date`
    - Check constraint to ensure `heure_debut` < `heure_fin`

  3. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create the employee_schedules table
CREATE TABLE IF NOT EXISTS employee_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  heure_debut time NOT NULL,
  heure_fin time NOT NULL,
  pause_debut time,
  pause_fin time,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_employee_schedule_per_day UNIQUE (employee_id, date),
  CONSTRAINT valid_times CHECK (heure_debut < heure_fin)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_employee_schedules_employee_date 
ON employee_schedules(employee_id, date);

-- Enable Row Level Security
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Les administrateurs peuvent gérer les horaires"
ON employee_schedules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM userapplication 
    WHERE userapplication.role = 'admin' 
    AND userapplication.id = auth.uid()
  )
);

CREATE POLICY "Les utilisateurs authentifiés peuvent lire les horaires"
ON employee_schedules
FOR SELECT
TO authenticated
USING (true);

-- Create trigger function for attendance
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

-- Create trigger
CREATE TRIGGER employee_schedules_attendance_trigger
AFTER INSERT OR UPDATE ON employee_schedules
FOR EACH ROW
EXECUTE FUNCTION update_employee_attendance();