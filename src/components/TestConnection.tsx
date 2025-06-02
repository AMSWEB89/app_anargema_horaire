import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from 'lucide-react';

export default function TestConnection() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Test de connexion en cours...');

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('nom')
        .limit(1);

      if (error) throw error;

      setStatus('success');
      setMessage('Connexion BDD réussie !');
    } catch (error) {
      setStatus('error');
      setMessage('Connexion BDD échouée !');
    }
  };

  return (
    <div className={`p-4 rounded-lg flex items-center gap-3 ${
      status === 'loading' ? 'bg-yellow-50 text-yellow-700' :
      status === 'success' ? 'bg-green-50 text-green-700' :
      'bg-red-50 text-red-700'
    }`}>
      <Database className="h-5 w-5" />
      <span>{message}</span>
    </div>
  );
}