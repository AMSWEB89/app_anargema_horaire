import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, Info } from 'lucide-react';

interface AdminInterfaceProps {
  onLogout: () => void;
}

type Role = 'administrateur';

export default function AdminInterface({ onLogout }: AdminInterfaceProps) {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showAbout, setShowAbout] = useState(false);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    navigate('/administrateur');
  };

  return (
    <div className="min-h-screen bg-[#1A4D2E]">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-semibold text-emerald-900" style={{ fontFamily: "'Amiri', serif" }}>
              Compte Administrateur
            </h1>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut size={20} />
              Déconnexion
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => handleRoleSelect('administrateur')}
              className={`bg-emerald-50 p-6 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-all duration-200 ${
                selectedRole === 'administrateur' ? 'ring-2 ring-emerald-500' : ''
              }`}
            >
              <div className="flex flex-col items-center gap-4">
                <Settings className="h-16 w-16 text-emerald-600" />
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-emerald-900 mb-2">Admin</h2>
                  <p className="text-emerald-600">Gestion des utilisateurs</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setShowAbout(true)}
              className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-all duration-200"
            >
              <div className="flex flex-col items-center gap-4">
                <Info className="h-16 w-16 text-emerald-600" />
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-emerald-900 mb-2">À propos</h2>
                  <p className="text-emerald-600">Retour Menu Admin</p>
                </div>
              </div>
            </button>
          </div>

          {showAbout && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold text-emerald-900">À propos</h2>
                  <button
                    onClick={() => setShowAbout(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>
                <div className="text-center">
                  <p className="text-lg text-emerald-800 mb-4">
                    Application développée par ADIB Mohamed Saber (AMS) pour la gestion des horaires des employés de l'EPIC ANARGEMA.
                  </p>
                </div>
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowAbout(false)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}