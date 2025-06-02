import React from 'react';
import { LogOut } from 'lucide-react';

interface NavBarProps {
  onLogout: () => void;
  userRole: string;
}

export default function NavBar({ onLogout, userRole }: NavBarProps) {
  return (
    <div className="bg-emerald-800 text-white px-6 py-4 flex justify-between items-center">
      <h2 className="text-xl font-semibold">
        Interface {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
      </h2>
      <div className="absolute left-1/2 transform -translate-x-1/2 text-xl font-semibold" style={{ fontFamily: "'Amiri', serif" }}>
        الـوكالة الوطنيـــة لإنجـــاز جامـــع الجزائــر وتســـييــره
      </div>
      <button
        onClick={onLogout}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg transition-colors"
      >
        <LogOut size={20} />
        Déconnexion
      </button>
    </div>
  );
}