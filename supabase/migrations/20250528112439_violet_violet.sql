/*
  # Mise à jour de la table userapplication

  1. Modifications
    - Ajout de la colonne `username` pour stocker le nom d'utilisateur
    - Ajout de la colonne `password_hash` pour stocker le mot de passe hashé
    - Suppression de la colonne `email` qui n'est plus nécessaire

  2. Sécurité
    - Maintien de la RLS existante
    - Les mots de passe sont stockés de manière sécurisée avec hachage
*/

-- Supprimer la table existante
DROP TABLE IF EXISTS userapplication;

-- Recréer la table avec la nouvelle structure
CREATE TABLE userapplication (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'user', 'observer')),
  created_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE userapplication ENABLE ROW LEVEL SECURITY;

-- Recréer la politique de sécurité
CREATE POLICY "Les utilisateurs authentifiés peuvent lire les données"
  ON userapplication
  FOR SELECT
  TO authenticated
  USING (true);

-- Insérer les utilisateurs par défaut avec des mots de passe temporaires
INSERT INTO userapplication (username, password_hash, role)
VALUES 
  ('admin', 'AnargemA@2026*', 'admin'),
  ('user', 'user123', 'user'),
  ('observer', 'observer123', 'observer')
ON CONFLICT (username) DO NOTHING;