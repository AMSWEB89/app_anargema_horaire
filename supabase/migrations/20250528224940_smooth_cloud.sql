-- Create the departments table
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert existing unique departments from employees table
INSERT INTO departments (nom)
SELECT DISTINCT departement
FROM employees;

-- Add a foreign key constraint to the employees table
ALTER TABLE employees
ADD CONSTRAINT fk_department
FOREIGN KEY (departement) REFERENCES departments(nom)
ON UPDATE CASCADE;

-- Create an index on the department name
CREATE INDEX idx_department_nom ON departments(nom);