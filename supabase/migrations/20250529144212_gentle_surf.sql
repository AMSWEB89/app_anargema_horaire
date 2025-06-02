-- Fonction pour marquer les employés comme absents par défaut
CREATE OR REPLACE FUNCTION mark_employees_absent()
RETURNS TRIGGER AS $$
BEGIN
  -- Quand un nouvel employé est ajouté, le marquer comme absent pour la date actuelle
  INSERT INTO employee_attendance (employee_id, date, is_present)
  VALUES (NEW.id, CURRENT_DATE, false)
  ON CONFLICT (employee_id, date) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour marquer les nouveaux employés comme absents
DROP TRIGGER IF EXISTS new_employee_absent_trigger ON employees;
CREATE TRIGGER new_employee_absent_trigger
AFTER INSERT ON employees
FOR EACH ROW
EXECUTE FUNCTION mark_employees_absent();

-- Fonction pour marquer tous les employés comme absents au début de la journée
CREATE OR REPLACE FUNCTION mark_all_employees_absent()
RETURNS void AS $$
BEGIN
  -- Marquer tous les employés comme absents pour la date actuelle
  INSERT INTO employee_attendance (employee_id, date, is_present)
  SELECT id, CURRENT_DATE, false
  FROM employees
  ON CONFLICT (employee_id, date) DO NOTHING;
END;
$$ LANGUAGE plpgsql;