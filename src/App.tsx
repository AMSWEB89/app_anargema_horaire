import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User, Lock, UserCog } from 'lucide-react';
import { supabase } from './lib/supabase';
import AdminDashboard from './pages/AdminDashboard';
import AdminInterface from './pages/AdminInterface';
import SchedulePage from './pages/SchedulePage';
import ObserverDashboard from './pages/ObserverDashboard';
import TestConnection from './components/TestConnection';

type Role = 'admin' | 'user' | 'observer';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [isObserverLoggedIn, setIsObserverLoggedIn] = useState(false);

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    setIsUserLoggedIn(false);
    setIsObserverLoggedIn(false);
    setUsername('');
    setPassword('');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (role === 'admin') {
        if (username === 'admin' && password === 'AnargemA@2026*') {
          setIsAdminLoggedIn(true);
        } else {
          throw new Error('Identifiants administrateur invalides');
        }
      } else {
        // Check if trying to use admin username with non-admin role
        if (username === 'admin') {
          throw new Error("Le nom d'utilisateur 'admin' est réservé pour le rôle Administrateur");
        }

        const { data: userData, error: userError } = await supabase
          .from('userapplication')
          .select('username, password_hash, role')
          .eq('username', username)
          .eq('role', role)
          .single();

        if (userError) throw new Error('Utilisateur non trouvé');
        if (userData.password_hash !== password) throw new Error('Mot de passe incorrect');
        
        if (role === 'user') {
          setIsUserLoggedIn(true);
        } else if (role === 'observer') {
          setIsObserverLoggedIn(true);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (isAdminLoggedIn) {
    return (
      <Router>
        <Routes>
          <Route path="/\" element={<AdminInterface onLogout={handleLogout} />} />
          <Route path="/administrateur" element={<AdminDashboard onLogout={handleLogout} />} />
          <Route path="/utilisateur" element={<SchedulePage onLogout={handleLogout} userRole="user" />} />
          <Route path="/observateur" element={<ObserverDashboard onLogout={handleLogout} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    );
  }

  if (isUserLoggedIn) {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<SchedulePage onLogout={handleLogout} userRole="user" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    );
  }

  if (isObserverLoggedIn) {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<ObserverDashboard onLogout={handleLogout} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    );
  }

  const getRoleLabel = (role: Role): string => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'user':
        return 'Utilisateur';
      case 'observer':
        return 'Observateur';
    }
  };

  const getRoleIcon = () => {
    switch (role) {
      case 'admin':
        return <UserCog className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-600" />;
      default:
        return <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-600" />;
    }
  };

  return (
    <div className="min-h-screen relative bg-[#1A4D2E] overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('/OIP.jpeg')`,
          filter: 'brightness(0.6)'
        }}
      />
      
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-8 w-full max-w-md border border-emerald-100">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-emerald-900 mb-2">ANARGEMA DRHFI</h1>
            <p className="text-emerald-700">Gestion des Horaires</p>
          </div>
          
          <TestConnection />

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm border border-red-100 mt-4">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-6 mt-6">
            <div className="grid grid-cols-3 gap-3">
              {(['admin', 'user', 'observer'] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`p-3 text-sm rounded-xl transition-all duration-300 border ${
                    role === r
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-lg'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                  }`}
                >
                  {getRoleLabel(r)}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-emerald-800 mb-2">
                Nom d'utilisateur
              </label>
              <div className="relative">
                {getRoleIcon()}
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 w-full p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50/50"
                  placeholder="votre_nom"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-emerald-800 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-600" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 w-full p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50/50"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3 px-4 rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300 shadow-lg"
            >
              {loading ? 'Chargement...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;