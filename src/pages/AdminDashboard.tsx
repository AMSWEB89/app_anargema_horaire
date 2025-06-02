import React, { useState, useEffect, useRef } from 'react';
import { Settings, Users, Clock, UserPlus, Pencil, Trash2, Key, Database, Search, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clearTables } from '../lib/clearTables';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';

interface AdminDashboardProps {
  onLogout: () => void;
}

interface Employee {
  id?: string;
  nom: string;
  prenom: string;
  departement: string;
  fonction: string;
}

interface Department {
  id: string;
  nom: string;
  created_at: string;
}

interface PasswordUpdate {
  role: 'admin' | 'user' | 'observer';
  newPassword: string;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'password' | 'employees' | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchDepartment, setSearchDepartment] = useState('');
  const [showDepartmentList, setShowDepartmentList] = useState(false);
  const [searchEmployees, setSearchEmployees] = useState('');
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [selectedSearchEmployee, setSelectedSearchEmployee] = useState<Employee | null>(null);
  const [passwordUpdate, setPasswordUpdate] = useState<PasswordUpdate>({
    role: 'admin',
    newPassword: ''
  });
  const [employee, setEmployee] = useState<Employee>({
    nom: '',
    prenom: '',
    departement: '',
    fonction: ''
  });
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeSection === 'employees') {
      fetchEmployees();
      fetchDepartments();
    }
  }, [activeSection]);

  useEffect(() => {
    const filtered = employees.filter(emp => 
      emp.nom.toLowerCase().includes(searchEmployees.toLowerCase()) ||
      emp.prenom.toLowerCase().includes(searchEmployees.toLowerCase()) ||
      emp.departement.toLowerCase().includes(searchEmployees.toLowerCase()) ||
      emp.fonction.toLowerCase().includes(searchEmployees.toLowerCase())
    );
    setFilteredEmployees(filtered);
    setShowEmployeeList(searchEmployees.length > 0);
  }, [searchEmployees, employees]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deleteModalRef.current && !deleteModalRef.current.contains(event.target as Node)) {
        setShowDeleteConfirmation(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur lors de la récupération des employés:', error);
      return;
    }

    setEmployees(data || []);
  };

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('nom');

    if (error) {
      console.error('Erreur lors de la récupération des départements:', error);
      return;
    }

    setDepartments(data || []);
  };

  const handleClearTables = async () => {
    if (!confirm('Êtes-vous sûr de vouloir vider les tables de présence et d\'horaires ? Cette action est irréversible.')) {
      return;
    }

    const result = await clearTables();
    
    setUpdateMessage({
      type: result.success ? 'success' : 'error',
      text: result.message
    });

    setTimeout(() => setUpdateMessage(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (selectedEmployee?.id) {
        const { error } = await supabase
          .from('employees')
          .update({
            nom: employee.nom,
            prenom: employee.prenom,
            departement: searchDepartment,
            fonction: employee.fonction
          })
          .eq('id', selectedEmployee.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('employees')
          .insert([{
            ...employee,
            departement: searchDepartment
          }]);

        if (error) throw error;
      }

      await fetchEmployees();
      resetForm();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: passwordUpdate.role,
          newPassword: passwordUpdate.newPassword
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update password');
      }

      setUpdateMessage({
        type: 'success',
        text: `Mot de passe ${passwordUpdate.role} mis à jour avec succès`
      });
      
      setTimeout(() => setUpdateMessage(null), 3000);
      setPasswordUpdate({ ...passwordUpdate, newPassword: '' });
    } catch (error) {
      setUpdateMessage({
        type: 'error',
        text: error.message || 'Erreur lors de la mise à jour du mot de passe'
      });
    }
  };

  const handleEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    setEmployee(emp);
    setSearchDepartment(emp.departement);
    setActiveSection('employees');
  };

  const handleDelete = async (id: string) => {
    setEmployeeToDelete(id);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeToDelete);

      if (error) throw error;

      setUpdateMessage({
        type: 'success',
        text: 'Employé supprimé avec succès'
      });

      await fetchEmployees();
      setSelectedSearchEmployee(null);
      setSearchEmployees('');
    } catch (error) {
      setUpdateMessage({
        type: 'error',
        text: 'Erreur lors de la suppression de l\'employé'
      });
    } finally {
      setShowDeleteConfirmation(false);
      setEmployeeToDelete(null);
    }

    setTimeout(() => setUpdateMessage(null), 3000);
  };

  const resetForm = () => {
    setEmployee({ nom: '', prenom: '', departement: '', fonction: '' });
    setSelectedEmployee(null);
    setSearchDepartment('');
  };

  const handleEmployeeSelect = (emp: Employee) => {
    setSelectedSearchEmployee(emp);
    setSearchEmployees(`${emp.nom} ${emp.prenom}`);
    setShowEmployeeList(false);
  };

  const filteredDepartments = departments.filter(dept =>
    dept.nom.toLowerCase().includes(searchDepartment.toLowerCase())
  );

  const handleDepartmentSelect = (dept: Department) => {
    setSearchDepartment(dept.nom);
    setShowDepartmentList(false);
  };

  const handleAddNewDepartment = async () => {
    if (searchDepartment.trim()) {
      try {
        const { data, error } = await supabase
          .from('departments')
          .insert([{ nom: searchDepartment.trim() }])
          .select()
          .single();

        if (error) throw error;

        setDepartments([...departments, data]);
        setShowDepartmentList(false);
        setUpdateMessage({
          type: 'success',
          text: 'Département ajouté avec succès'
        });
      } catch (error) {
        setUpdateMessage({
          type: 'error',
          text: 'Erreur lors de l\'ajout du département'
        });
      }

      setTimeout(() => setUpdateMessage(null), 3000);
    }
  };

  const DeleteConfirmationModal = () => {
    if (!showDeleteConfirmation) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div ref={deleteModalRef} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
          <h3 className="text-xl font-semibold text-red-600 mb-4">
            Confirmation de suppression
          </h3>
          <p className="text-gray-600 mb-6">
            Êtes-vous sûr de vouloir supprimer cet employé ? Cette action est irréversible.
          </p>
          <div className="flex justify-end gap-4">
            <button
              onClick={() => {
                setShowDeleteConfirmation(false);
                setEmployeeToDelete(null);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Confirmer la suppression
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#1A4D2E]">
      <NavBar onLogout={onLogout} userRole="admin" />
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div 
              className={`bg-emerald-50 p-6 rounded-xl border border-emerald-100 cursor-pointer transition-all duration-200 ${activeSection === 'password' ? 'ring-2 ring-emerald-500' : 'hover:bg-emerald-100'}`}
              onClick={() => setActiveSection(activeSection === 'password' ? null : 'password')}
            >
              <div className="flex items-center gap-4 mb-4">
                <Key className="h-8 w-8 text-emerald-600" />
                <h2 className="text-xl font-semibold text-emerald-900">Administration</h2>
              </div>
              <p className="text-emerald-700">Gérez les mots de passe des comptes</p>
            </div>

            <div 
              className={`bg-emerald-50 p-6 rounded-xl border border-emerald-100 cursor-pointer transition-all duration-200 ${activeSection === 'employees' ? 'ring-2 ring-emerald-500' : 'hover:bg-emerald-100'}`}
              onClick={() => setActiveSection(activeSection === 'employees' ? null : 'employees')}
            >
              <div className="flex items-center gap-4 mb-4">
                <Users className="h-8 w-8 text-emerald-600" />
                <h2 className="text-xl font-semibold text-emerald-900">Employés</h2>
              </div>
              <p className="text-emerald-700">Gérez les employés et leurs informations</p>
            </div>

            <div 
              className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-all duration-200"
              onClick={() => navigate('/')}
            >
              <div className="flex items-center gap-4 mb-4">
                <Clock className="h-8 w-8 text-emerald-600" />
                <h2 className="text-xl font-semibold text-emerald-900">Retour</h2>
              </div>
              <p className="text-emerald-700">Retour au menu principal</p>
            </div>
          </div>

          <div className="mb-8">
            <button
              onClick={handleClearTables}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Database size={20} />
              Vider les tables de présence et d'horaires
            </button>
          </div>

          {activeSection === 'password' && (
            <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 mb-8">
              <div className="flex items-center gap-4 mb-6">
                <Key className="h-8 w-8 text-emerald-600" />
                <h2 className="text-xl font-semibold text-emerald-900">
                  Gestion des Mots de Passe
                </h2>
              </div>

              {updateMessage && (
                <div className={`p-4 mb-4 rounded-lg ${
                  updateMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {updateMessage.text}
                </div>
              )}

              <form onSubmit={handlePasswordUpdate} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-emerald-800 mb-2">
                    Sélectionner le compte
                  </label>
                  <select
                    value={passwordUpdate.role}
                    onChange={(e) => setPasswordUpdate({
                      ...passwordUpdate,
                      role: e.target.value as 'admin' | 'user' | 'observer'
                    })}
                    className="w-full p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50/50"
                  >
                    <option value="admin">Administrateur</option>
                    <option value="user">Utilisateur</option>
                    <option value="observer">Observateur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-emerald-800 mb-2">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={passwordUpdate.newPassword}
                    onChange={(e) => setPasswordUpdate({
                      ...passwordUpdate,
                      newPassword: e.target.value
                    })}
                    className="w-full p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50/50"
                    required
                    minLength={8}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 text-white py-3 px-4 rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors duration-300 shadow-lg"
                >
                  Mettre à jour le mot de passe
                </button>
              </form>
            </div>
          )}

          {activeSection === 'employees' && (
            <>
              <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 mb-8">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                    <Users className="h-8 w-8 text-emerald-600" />
                    <h2 className="text-xl font-semibold text-emerald-900">Liste des Employés</h2>
                  </div>
                  <button
                    onClick={() => {
                      resetForm();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <UserPlus size={20} />
                    Ajouter un employé
                  </button>
                </div>

                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-600" />
                    <input
                      type="text"
                      value={searchEmployees}
                      onChange={(e) => setSearchEmployees(e.target.value)}
                      placeholder="Rechercher un employé..."
                      className="w-full pl-10 p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    />
                    {showEmployeeList && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-emerald-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                        {filteredEmployees.length > 0 ? (
                          filteredEmployees.map((emp) => (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => handleEmployeeSelect(emp)}
                              className="w-full text-left px-4 py-2 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none"
                            >
                              <div className="font-medium">{emp.nom} {emp.prenom}</div>
                              <div className="text-sm text-emerald-600">{emp.departement}</div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-gray-500">
                            Aucun employé trouvé
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-emerald-100">
                        <th className="px-4 py-2 text-left">Nom</th>
                        <th className="px-4 py-2 text-left">Prénom</th>
                        <th className="px-4 py-2 text-left">Département</th>
                        <th className="px-4 py-2 text-left">Fonction</th>
                        <th className="px-4 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSearchEmployee ? (
                        <tr className="border-b border-emerald-100 hover:bg-emerald-50/50">
                          <td className="px-4 py-2">{selectedSearchEmployee.nom}</td>
                          <td className="px-4 py-2">{selectedSearchEmployee.prenom}</td>
                          <td className="px-4 py-2">{selectedSearchEmployee.departement}</td>
                          <td className="px-4 py-2">{selectedSearchEmployee.fonction}</td>
                          <td className="px-4 py-2 text-right">
                            <button
                              onClick={() => handleEdit(selectedSearchEmployee)}
                              className="text-blue-600 hover:text-blue-800 mr-2"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => selectedSearchEmployee.id && handleDelete(selectedSearchEmployee.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                            Sélectionnez un employé dans la barre de recherche
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-4 mb-6">
                  <UserPlus className="h-8 w-8 text-emerald-600" />
                  <h2 className="text-xl font-semibold text-emerald-900">
                    {selectedEmployee ? 'Modifier un Employé' : 'Ajouter un Employé'}
                  </h2>
                </div>
                
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-emerald-800 mb-2">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={employee.nom}
                      onChange={(e) => setEmployee({...employee, nom: e.target.value})}
                      className="w-full p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50/50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-emerald-800 mb-2">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={employee.prenom}
                      onChange={(e) => setEmployee({...employee, prenom: e.target.value})}
                      className="w-full p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50/50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-emerald-800 mb-2">
                      Département
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-600" />
                      <input
                        type="text"
                        value={searchDepartment}
                        onChange={(e) => {
                          setSearchDepartment(e.target.value);
                          setShowDepartmentList(true);
                        }}
                        onFocus={() => setShowDepartmentList(true)}
                        placeholder="Rechercher ou ajouter un département..."
                        className="w-full pl-10 p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50/50"
                        required
                      />
                      {showDepartmentList && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-emerald-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                          {filteredDepartments.map((dept) => (
                            <button
                              key={dept.id}
                              type="button"
                              onClick={() => handleDepartmentSelect(dept)}
                              className="w-full text-left px-4 py-2 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none"
                            >
                              {dept.nom}
                            </button>
                          ))}
                          {searchDepartment && !filteredDepartments.some(d => d.nom.toLowerCase() === searchDepartment.toLowerCase()) && (
                            <div className="p-2 border-t border-emerald-100">
                              <button
                                type="button"
                                onClick={handleAddNewDepartment}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                              >
                                <Plus size={16} />
                                Ajouter ce département
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-emerald-800 mb-2">
                      Fonction
                    </label>
                    <input
                      type="text"
                      value={employee.fonction}
                      onChange={(e) => setEmployee({...employee, fonction: e.target.value})}
                      className="w-full p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50/50"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      className="w-full bg-emerald-600 text-white py-3 px-4 rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors duration-300 shadow-lg"
                    >
                      {selectedEmployee ? 'Modifier l\'employé' : 'Ajouter l\'employé'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
      <DeleteConfirmationModal />
    </div>
  );
}