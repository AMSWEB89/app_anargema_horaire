/*
  # Création de la table userapplication

  1. Nouvelle Table
    - `userapplication`
      - `id` (uuid, clé primaire)
      - `email` (text, unique)
      - `role` (text)
      - `created_at` (timestamp)

  2. Sécurité
    - Activation de RLS sur la table `userapplication`
    - Ajout d'une politique pour permettre la lecture aux utilisateurs authentifiés
*/

CREATE TABLE IF NOT EXISTS userapplication (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'user', 'observer')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE userapplication ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs authentifiés peuvent lire les données"
  ON userapplication
  FOR SELECT
  TO authenticated
  USING (true);

-- Insertion des utilisateurs par défaut
INSERT INTO userapplication (email, role)
VALUES 
  ('admin@example.com', 'admin'),
  ('user@example.com', 'user'),
  ('observer@example.com', 'observer')
ON CONFLICT (email) DO NOTHING;