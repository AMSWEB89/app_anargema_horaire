/*
  # Fix duplicate employee attendance triggers

  1. Changes
    - Remove duplicate trigger `new_employee_absent_trigger`
    - Keep `mark_new_employee_absent` trigger
    - Add safety check in trigger function to prevent duplicate entries

  2. Reasoning
    - Having two triggers doing the same thing causes duplicate inserts
    - Adding a safety check prevents duplicate entries even if called multiple times
*/

-- Drop the duplicate trigger
DROP TRIGGER IF EXISTS new_employee_absent_trigger ON employees;

-- Update the trigger function to include duplicate check
CREATE OR REPLACE FUNCTION mark_new_employee_absent()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if attendance record already exists for this employee and date
  IF NOT EXISTS (
    SELECT 1 
    FROM employee_attendance 
    WHERE employee_id = NEW.id 
    AND date = CURRENT_DATE
  ) THEN
    -- Only insert if no record exists
    INSERT INTO employee_attendance (
      employee_id,
      date,
      is_present,
      created_at
    ) VALUES (
      NEW.id,
      CURRENT_DATE,
      false,
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;