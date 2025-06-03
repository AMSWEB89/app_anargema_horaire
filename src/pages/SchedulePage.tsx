import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Trash2, Search, Lock, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import NavBar from '../components/NavBar';

interface SchedulePageProps {
  onLogout: () => void;
  userRole: string;
}

interface Employee {
  id: string;
  nom: string;
  prenom: string;
  departement: string;
}

interface Schedule {
  id: string;
  employee_id: string;
  date: string;
  heure_debut: string;
  pause_debut: string | null;
  pause_fin: string | null;
  heure_fin: string | null;
}

export default function SchedulePage({ onLogout, userRole }: SchedulePageProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [newSchedule, setNewSchedule] = useState({
    heure_debut: '',
    pause_debut: null as string | null,
    pause_fin: null as string | null,
    heure_fin: null as string | null
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);
  const [showAbsentList, setShowAbsentList] = useState(false);
  const [absentEmployees, setAbsentEmployees] = useState<Employee[]>([]);
  const [absentSearchTerm, setAbsentSearchTerm] = useState('');
  const [showPresentList, setShowPresentList] = useState(false);
  const [presentEmployees, setPresentEmployees] = useState<Employee[]>([]);
  const [presentSearchTerm, setPresentSearchTerm] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  const absentListRef = useRef<HTMLDivElement>(null);
  const presentListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchEmployees();
    fetchAbsentEmployees();
    fetchPresentEmployees();

    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowEmployeeList(false);
      }
      if (deleteModalRef.current && !deleteModalRef.current.contains(event.target as Node)) {
        setShowDeleteConfirmation(false);
        setAdminPassword('');
      }
      if (absentListRef.current && !absentListRef.current.contains(event.target as Node)) {
        setShowAbsentList(false);
      }
      if (presentListRef.current && !presentListRef.current.contains(event.target as Node)) {
        setShowPresentList(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedDate]);

  useEffect(() => {
    if (selectedEmployee && selectedDate) {
      fetchSchedules();
    }
  }, [selectedEmployee, selectedDate]);

  useEffect(() => {
    const filtered = employees.filter(emp => 
      emp.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.departement.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEmployees(filtered);
  }, [searchTerm, employees]);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('id, nom, prenom, departement')
      .order('nom');

    if (error) {
      console.error('Erreur lors de la récupération des employés:', error);
      return;
    }

    setEmployees(data || []);
    setFilteredEmployees(data || []);
  };

  const fetchAbsentEmployees = async () => {
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('employee_attendance')
      .select(`
        employee_id,
        employees (
          id,
          nom,
          prenom,
          departement
        )
      `)
      .eq('date', selectedDate)
      .eq('is_present', false);

    if (attendanceError) {
      console.error('Erreur lors de la récupération des absences:', attendanceError);
      return;
    }

    const absentEmployees = attendanceData
      ?.map(attendance => attendance.employees as Employee)
      .filter(Boolean);

    setAbsentEmployees(absentEmployees || []);
  };

  const fetchPresentEmployees = async () => {
    try {
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('employee_attendance')
        .select(`
          employee_id,
          employees (
            id,
            nom,
            prenom,
            departement
          )
        `)
        .eq('date', selectedDate)
        .eq('is_present', true);

      if (attendanceError) throw attendanceError;

      const presentEmployees = attendanceData
        ?.map(attendance => attendance.employees as Employee)
        .filter(Boolean);

      setPresentEmployees(presentEmployees || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des présences:', error);
    }
  };

  const fetchSchedules = async () => {
    const { data, error } = await supabase
      .from('employee_schedules')
      .select('*')
      .eq('employee_id', selectedEmployee)
      .eq('date', selectedDate)
      .maybeSingle();

    if (error) {
      console.error('Erreur lors de la récupération des horaires:', error);
      return;
    }

    setSchedules(data ? [data] : []);
    if (data) {
      setNewSchedule({
        heure_debut: data.heure_debut,
        pause_debut: data.pause_debut,
        pause_fin: data.pause_fin,
        heure_fin: data.heure_fin
      });
    } else {
      setNewSchedule({
        heure_debut: '',
        pause_debut: null,
        pause_fin: null,
        heure_fin: null
      });
    }
  };

  const calculateWorkDuration = (debut: string, fin: string | null, pauseDebut: string | null, pauseFin: string | null): string => {
    if (!fin) return '-';
    const [debutHours, debutMinutes] = debut.split(':').map(Number);
    const [finHours, finMinutes] = fin.split(':').map(Number);
    
    let durationMinutes = (finHours * 60 + finMinutes) - (debutHours * 60 + debutMinutes);
    
    if (pauseDebut && pauseFin) {
      const [pauseDebutHours, pauseDebutMinutes] = pauseDebut.split(':').map(Number);
      const [pauseFinHours, pauseFinMinutes] = pauseFin.split(':').map(Number);
      
      const pauseDurationMinutes = (pauseFinHours * 60 + pauseFinMinutes) - (pauseDebutHours * 60 + pauseDebutMinutes);
      durationMinutes -= pauseDurationMinutes;
    }
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  };

  const addMinutesToTime = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!newSchedule.heure_debut) {
        throw new Error('L\'heure de début est requise');
      }

      const scheduleData = {
        employee_id: selectedEmployee,
        date: selectedDate,
        heure_debut: newSchedule.heure_debut,
        pause_debut: newSchedule.pause_debut,
        pause_fin: newSchedule.pause_fin,
        heure_fin: newSchedule.heure_fin
      };

      const { data: existingSchedule } = await supabase
        .from('employee_schedules')
        .select('*')
        .eq('employee_id', selectedEmployee)
        .eq('date', selectedDate)
        .maybeSingle();

      if (existingSchedule) {
        const { error } = await supabase
          .from('employee_schedules')
          .update(scheduleData)
          .eq('id', existingSchedule.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('employee_schedules')
          .insert([scheduleData]);

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Horaire enregistré avec succès' });
      fetchSchedules();
      fetchPresentEmployees();
      fetchAbsentEmployees();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Une erreur est survenue' 
      });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const handleDelete = async (scheduleId: string) => {
    setScheduleToDelete(scheduleId);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    try {
      const { data: adminUser, error: adminError } = await supabase
        .from('userapplication')
        .select('password_hash')
        .eq('role', 'admin')
        .single();

      if (adminError) throw new Error('Erreur lors de la vérification du mot de passe');
      if (adminUser.password_hash !== adminPassword) {
        throw new Error('Mot de passe administrateur incorrect');
      }

      if (!scheduleToDelete) return;

      // First, update the attendance record to mark the employee as absent
      const { data: schedule } = await supabase
        .from('employee_schedules')
        .select('employee_id, date')
        .eq('id', scheduleToDelete)
        .single();

      if (schedule) {
        const { error: attendanceError } = await supabase
          .from('employee_attendance')
          .upsert({
            employee_id: schedule.employee_id,
            date: schedule.date,
            is_present: false
          }, {
            onConflict: 'employee_id,date'
          });

        if (attendanceError) throw attendanceError;
      }

      // Then delete the schedule
      const { error } = await supabase
        .from('employee_schedules')
        .delete()
        .eq('id', scheduleToDelete);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Horaire supprimé avec succès' });
      setSchedules([]);
      setNewSchedule({
        heure_debut: '',
        pause_debut: null,
        pause_fin: null,
        heure_fin: null
      });

      // Refresh both present and absent lists
      await Promise.all([
        fetchPresentEmployees(),
        fetchAbsentEmployees()
      ]);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Erreur lors de la suppression'
      });
    } finally {
      setShowDeleteConfirmation(false);
      setAdminPassword('');
      setScheduleToDelete(null);
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const handleEmployeeSelect = (emp: Employee) => {
    setSelectedEmployee(emp.id);
    setSelectedEmployeeName(`${emp.nom} ${emp.prenom} - ${emp.departement}`);
    setShowEmployeeList(false);
    setSearchTerm('');
  };

  const isFieldEditable = (schedule: Schedule | null, fieldName: keyof Schedule) => {
    if (!schedule) return true;
    return schedule[fieldName] === null;
  };

  const filteredAbsentEmployees = absentEmployees.filter(emp =>
    emp.nom.toLowerCase().includes(absentSearchTerm.toLowerCase()) ||
    emp.prenom.toLowerCase().includes(absentSearchTerm.toLowerCase()) ||
    emp.departement.toLowerCase().includes(absentSearchTerm.toLowerCase())
  );

  const filteredPresentEmployees = presentEmployees.filter(emp =>
    emp.nom.toLowerCase().includes(presentSearchTerm.toLowerCase()) ||
    emp.prenom.toLowerCase().includes(presentSearchTerm.toLowerCase()) ||
    emp.departement.toLowerCase().includes(presentSearchTerm.toLowerCase())
  );

  const DeleteConfirmationModal = () => {
    if (!showDeleteConfirmation) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div ref={deleteModalRef} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
          <h3 className="text-xl font-semibold text-emerald-900 mb-4">
            Confirmation de suppression
          </h3>
          <p className="text-gray-600 mb-4">
            Veuillez entrer le mot de passe administrateur pour confirmer la suppression de l'horaire.
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-emerald-800 mb-2">
              Mot de passe administrateur
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-600" />
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full pl-10 p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="flex justify-end gap-4">
            <button
              onClick={() => {
                setShowDeleteConfirmation(false);
                setAdminPassword('');
              }}
              className="px-4 py-2 text-emerald-600 hover:text-emerald-800"
            >
              Annuler
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Confirmer
            </button>
          </div>
        </div>
      </div>
    );
  };

  const AbsentEmployeesList = () => {
    if (!showAbsentList) return null;

    return (
      <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg z-50" ref={absentListRef}>
        <div className="p-4">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-600" />
              <input
                type="text"
                value={absentSearchTerm}
                onChange={(e) => setAbsentSearchTerm(e.target.value)}
                placeholder="Rechercher un employé absent..."
                className="w-full pl-10 p-3 border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredAbsentEmployees.length > 0 ? (
              <div className="space-y-2">
                {filteredAbsentEmployees.map((emp) => (
                  <div key={emp.id} className="p-3 hover:bg-red-50 rounded-lg">
                    <p className="font-medium text-gray-900">{emp.nom} {emp.prenom}</p>
                    <p className="text-sm text-red-600">{emp.departement}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                Aucun employé absent trouvé
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const PresentEmployeesList = () => {
    if (!showPresentList) return null;

    return (
      <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg z-50" ref={presentListRef}>
        <div className="p-4">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-600" />
              <input
                type="text"
                value={presentSearchTerm}
                onChange={(e) => setPresentSearchTerm(e.target.value)}
                placeholder="Rechercher un employé présent..."
                className="w-full pl-10 p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredPresentEmployees.length > 0 ? (
              <div className="space-y-2">
                {filteredPresentEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => {
                      handleEmployeeSelect(emp);
                      setShowPresentList(false);
                    }}
                    className="w-full text-left p-3 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <p className="font-medium text-gray-900">{emp.nom} {emp.prenom}</p>
                    <p className="text-sm text-emerald-600">{emp.departement}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                Aucun employé présent trouvé
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#1A4D2E]">
      <NavBar onLogout={onLogout} userRole={userRole} />
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-semibold text-emerald-900" style={{ fontFamily: "'Amiri', serif" }}>
              Gestion des Horaires
            </h1>
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowPresentList(!showPresentList)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  <Users size={20} />
                  <span>Liste des Employés Présents</span>
                  <span className="ml-2 bg-white text-emerald-600 px-2 py-0.5 rounded-full text-sm font-semibold">
                    {presentEmployees.length}
                  </span>
                </button>
                <PresentEmployeesList />
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowAbsentList(!showAbsentList)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Users size={20} />
                  <span>Employés supprimer aujourd'hui !</span>
                  <span className="ml-2 bg-white text-red-600 px-2 py-0.5 rounded-full text-sm font-semibold">
                    {absentEmployees.length}
                  </span>
                </button>
                <AbsentEmployeesList />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-4 mb-6">
                <Clock className="h-8 w-8 text-emerald-600" />
                <h2 className="text-xl font-semibold text-emerald-900">
                  {schedules.length > 0 ? 'Compléter l\'Horaire' : 'Ajouter un Horaire'}
                </h2>
              </div>

              {message && (
                <div
                  className={`p-4 mb-4 rounded-lg ${
                    message.type === 'success'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-emerald-800 mb-2">
                    Sélectionner un employé
                  </label>
                  <div className="relative" ref={searchRef}>
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-600" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowEmployeeList(true);
                      }}
                      onFocus={() => setShowEmployeeList(true)}
                      placeholder="Rechercher par nom, prénom ou département..."
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

                {selectedEmployee && (
                  <div className="bg-emerald-100 p-3 rounded-lg">
                    <p className="text-emerald-800">Employé sélectionné :</p>
                    <p className="font-medium">{selectedEmployeeName}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-emerald-800 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-emerald-800 mb-2">
                      Heure de début
                    </label>
                    <input
                      type="time"
                      value={newSchedule.heure_debut}
                      onChange={(e) =>
                        setNewSchedule({ ...newSchedule, heure_debut: e.target.value })
                      }
                      className={`w-full p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                        isFieldEditable(schedules[0], 'heure_debut') ? 'bg-white' : 'bg-gray-100'
                      }`}
                      disabled={!isFieldEditable(schedules[0], 'heure_debut')}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-emerald-800 mb-2">
                      Début pause
                    </label>
                    <input
                      type="time"
                      value={newSchedule.pause_debut || ''}
                      onChange={(e) =>
                        setNewSchedule({ ...newSchedule, pause_debut: e.target.value || null })
                      }
                      className={`w-full p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                        isFieldEditable(schedules[0], 'pause_debut') ? 'bg-white' : 'bg-gray-100'
                      }`}
                      disabled={!isFieldEditable(schedules[0], 'pause_debut')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-emerald-800 mb-2">
                      Fin pause
                    </label>
                    <input
                      type="time"
                      value={newSchedule.pause_fin || ''}
                      onChange={(e) =>
                        setNewSchedule({ ...newSchedule, pause_fin: e.target.value || null })
                      }
                      className={`w-full p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                        isFieldEditable(schedules[0], 'pause_fin') ? 'bg-white' : 'bg-gray-100'
                      }`}
                      disabled={!isFieldEditable(schedules[0], 'pause_fin')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-emerald-800 mb-2">
                      Heure de fin
                    </label>
                    <input
                      type="time"
                      value={newSchedule.heure_fin || ''}
                      onChange={(e) =>
                        setNewSchedule({ ...newSchedule, heure_fin: e.target.value || null })
                      }
                      className={`w-full p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                        isFieldEditable(schedules[0], 'heure_fin') ? 'bg-white' : 'bg-gray-100'
                      }`}
                      disabled={!isFieldEditable(schedules[0], 'heure_fin')}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!selectedEmployee}
                  className="w-full bg-emerald-600 text-white py-3 px-4 rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {schedules.length > 0 ? 'Compléter l\'horaire' : 'Ajouter l\'horaire'}
                </button>
              </form>
            </div>

            <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-4 mb-6">
                <Calendar className="h-8 w-8 text-emerald-600" />
                <h2 className="text-xl font-semibold text-emerald-900">
                  Horaire du jour
                </h2>
              </div>

              {schedules.length > 0 ? (
                <div className="space-y-4">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="bg-white p-4 rounded-lg border border-emerald-100"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-emerald-900">Horaire planifié</h3>
                        <button
                          onClick={() => handleDelete(schedule.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <p className="text-sm text-emerald-600">Début</p>
                          <p className="font-semibold">{schedule.heure_debut}</p>
                        </div>
                        <div>
                          <p className="text-sm text-emerald-600">Début pause</p>
                          <p className="font-semibold">{schedule.pause_debut || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-emerald-600">Fin pause</p>
                          <p className="font-semibold">{schedule.pause_fin || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-emerald-600">Fin</p>
                          <p className="font-semibold">{schedule.heure_fin || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-emerald-600">Durée totale</p>
                          <p className="font-semibold">
                            {calculateWorkDuration(
                              schedule.heure_debut,
                              schedule.heure_fin,
                              schedule.pause_debut,
                              schedule.pause_fin
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-emerald-600">
                  Aucun horaire défini pour cette date
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <DeleteConfirmationModal />
    </div>
  );
}