/*
  # Add employee schedules table

  1. New Tables
    - `employee_schedules`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key to employees.id)
      - `date` (date)
      - `heure_debut` (time without time zone)
      - `heure_fin` (time without time zone)
      - `pause_debut` (time without time zone, nullable)
      - `pause_fin` (time without time zone, nullable)
      - `created_at` (timestamptz)

  2. Constraints
    - Primary key on `id`
    - Foreign key from `employee_id` to `employees.id`
    - Unique constraint on `employee_id` and `date`
    - Check constraint to ensure `heure_debut` is before `heure_fin`

  3. Indexes
    - Index on `employee_id` and `date` for faster lookups
*/

-- Create the employee_schedules table
CREATE TABLE IF NOT EXISTS employee_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  heure_debut time without time zone NOT NULL,
  heure_fin time without time zone NOT NULL,
  pause_debut time without time zone,
  pause_fin time without time zone,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_employee_schedule_per_day UNIQUE (employee_id, date),
  CONSTRAINT valid_times CHECK (heure_debut < heure_fin)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employee_schedules_employee_date 
ON employee_schedules(employee_id, date);

-- Enable RLS
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
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