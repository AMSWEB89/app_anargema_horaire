/*
  # Add RLS policies for employee schedules table

  1. Security Changes
    - Enable RLS on employee_schedules table
    - Add policies for:
      - Authenticated users can read all schedules
      - Admin users can insert/update/delete schedules
      - Regular users can view their own schedules
      - Observer users can only read schedules

  2. Changes
    - Enable row level security
    - Create policies for CRUD operations based on user roles
*/

-- Enable RLS
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;

-- Policy for reading schedules (all authenticated users)
CREATE POLICY "Authenticated users can read schedules"
ON employee_schedules
FOR SELECT
TO authenticated
USING (true);

-- Policy for inserting schedules (admin users only)
CREATE POLICY "Admin users can insert schedules"
ON employee_schedules
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM userapplication
    WHERE userapplication.id = auth.uid()
    AND userapplication.role = 'admin'
  )
);

-- Policy for updating schedules (admin users only)
CREATE POLICY "Admin users can update schedules"
ON employee_schedules
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM userapplication
    WHERE userapplication.id = auth.uid()
    AND userapplication.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM userapplication
    WHERE userapplication.id = auth.uid()
    AND userapplication.role = 'admin'
  )
);

-- Policy for deleting schedules (admin users only)
CREATE POLICY "Admin users can delete schedules"
ON employee_schedules
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM userapplication
    WHERE userapplication.id = auth.uid()
    AND userapplication.role = 'admin'
  )
);