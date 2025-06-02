/*
  # Remove RLS from employees table
  
  1. Changes
    - Drop existing table if it exists
    - Create employees table without RLS
    - No RLS policies needed
*/

-- Drop the existing table if it exists
DROP TABLE IF EXISTS employees;

-- Create the table without RLS
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  prenom text NOT NULL,
  departement text NOT NULL,
  fonction text NOT NULL,
  created_at timestamptz DEFAULT now()
);