CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  prenom text NOT NULL,
  departement text NOT NULL,
  fonction text NOT NULL,
  created_at timestamptz DEFAULT now()
);