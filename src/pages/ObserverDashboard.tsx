import React, { useState, useEffect, useRef } from 'react';
import { Users, Calendar, X, Clock, FileSpreadsheet, Calendar as CalendarIcon, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import NavBar from '../components/NavBar';
import * as XLSX from 'xlsx';

interface ObserverDashboardProps {
  onLogout: () => void;
}

interface Employee {
  id: string;
  nom: string;
  prenom: string;
  departement: string;
}

interface Schedule {
  heure_debut: string;
  heure_fin: string;
  pause_debut: string | null;
  pause_fin: string | null;
}

interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  is_present: boolean;
  note: string | null;
  employee: Employee;
  schedule?: Schedule;
}

export default function ObserverDashboard({ onLogout }: ObserverDashboardProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPresentModal, setShowPresentModal] = useState(false);
  const [showAbsentModal, setShowAbsentModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAttendances();

    const scheduleSubscription = supabase
      .channel('any_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_schedules'
        },
        () => fetchAttendances()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_attendance'
        },
        () => fetchAttendances()
      )
      .subscribe();

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowPresentModal(false);
        setShowAbsentModal(false);
        setShowExportModal(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      scheduleSubscription.unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedDate]);

  const fetchAttendances = async () => {
    try {
      setLoading(true);

      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, nom, prenom, departement');

      if (employeesError) throw employeesError;

      const { data: scheduleData, error: scheduleError } = await supabase
        .from('employee_schedules')
        .select('employee_id, heure_debut, heure_fin, pause_debut, pause_fin')
        .eq('date', selectedDate);

      if (scheduleError) throw scheduleError;

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('employee_attendance')
        .select('*')
        .eq('date', selectedDate);

      if (attendanceError) throw attendanceError;

      const finalAttendances = employeesData?.map(employee => {
        const schedule = scheduleData?.find(s => s.employee_id === employee.id);
        const attendance = attendanceData?.find(a => a.employee_id === employee.id);
        
        return {
          id: attendance?.id || employee.id,
          employee_id: employee.id,
          date: selectedDate,
          is_present: schedule?.heure_debut ? (attendance?.is_present || false) : false,
          note: attendance?.note || null,
          employee: employee,
          schedule: schedule ? {
            heure_debut: schedule.heure_debut,
            heure_fin: schedule.heure_fin,
            pause_debut: schedule.pause_debut,
            pause_fin: schedule.pause_fin
          } : undefined
        };
      });

      setAttendances(finalAttendances || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWorkDuration = (debut: string, fin: string, pauseDebut: string | null, pauseFin: string | null): string => {
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

  const fetchAttendancesForExport = async (start: string, end: string) => {
    try {
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, nom, prenom, departement');

      if (employeesError) throw employeesError;

      const { data: scheduleData, error: scheduleError } = await supabase
        .from('employee_schedules')
        .select('employee_id, date, heure_debut, heure_fin, pause_debut, pause_fin')
        .gte('date', start)
        .lte('date', end);

      if (scheduleError) throw scheduleError;

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('employee_attendance')
        .select('*')
        .gte('date', start)
        .lte('date', end);

      if (attendanceError) throw attendanceError;

      const dateRange = [];
      const currentDate = new Date(start);
      const endDateObj = new Date(end);
      while (currentDate <= endDateObj) {
        dateRange.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const exportData = dateRange.flatMap(date => {
        return employeesData!.map(employee => {
          const schedule = scheduleData?.find(
            s => s.employee_id === employee.id && s.date === date
          );
          const attendance = attendanceData?.find(
            a => a.employee_id === employee.id && a.date === date
          );

          const duree = schedule ? calculateWorkDuration(
            schedule.heure_debut,
            schedule.heure_fin,
            schedule.pause_debut,
            schedule.pause_fin
          ) : '-';
          
          const status = schedule ? (attendance?.is_present ? 'Présent' : 'Absent') : 'Absent';

          return {
            Date: new Date(date).toLocaleDateString('fr-FR'),
            Nom: employee.nom,
            Prénom: employee.prenom,
            Département: employee.departement,
            Statut: status,
            'Heure de début': schedule?.heure_debut || '-',
            'Heure de fin': schedule?.heure_fin || '-',
            'Début pause': schedule?.pause_debut || '-',
            'Fin pause': schedule?.pause_fin || '-',
            'Durée de travail': duree,
            Note: attendance?.note || '-'
          };
        });
      });

      return exportData;
    } catch (error) {
      console.error('Erreur lors de la récupération des données pour l\'export:', error);
      return [];
    }
  };

  const handleExport = async () => {
    const data = await fetchAttendancesForExport(startDate, endDate);
    if (!data || data.length === 0) {
      alert('Aucune donnée à exporter pour cette période');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Présences');
    
    const colWidths = [
      { wch: 12 }, // Date
      { wch: 15 }, // Nom
      { wch: 15 }, // Prénom
      { wch: 20 }, // Département
      { wch: 12 }, // Statut
      { wch: 12 }, // Heure début
      { wch: 12 }, // Heure fin
      { wch: 12 }, // Début pause
      { wch: 12 }, // Fin pause
      { wch: 15 }, // Durée de travail
      { wch: 30 }, // Note
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `Présences_${startDate}_${endDate}.xlsx`);
    setShowExportModal(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    return time?.substring(0, 5) || '-';
  };

  const filterEmployees = (employees: Attendance[]) => {
    if (!searchTerm) return employees;
    
    return employees.filter(attendance => {
      const searchTermLower = searchTerm.toLowerCase();
      return (
        attendance.employee.nom.toLowerCase().includes(searchTermLower) ||
        attendance.employee.prenom.toLowerCase().includes(searchTermLower) ||
        attendance.employee.departement.toLowerCase().includes(searchTermLower)
      );
    });
  };

  const presentEmployees = filterEmployees(attendances.filter(a => a.is_present));
  const absentEmployees = filterEmployees(attendances.filter(a => !a.is_present));

  const ExportModal = () => {
    if (!showExportModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div ref={modalRef} className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="p-6 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
              <h2 className="text-xl font-semibold text-emerald-900">
                Exporter les présences
              </h2>
            </div>
            <button 
              onClick={() => setShowExportModal(false)}
              className="text-emerald-600 hover:text-emerald-900 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-emerald-800 mb-2">
                Date de début
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-emerald-800 mb-2">
                Date de fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <button
              onClick={handleExport}
              className="w-full bg-emerald-600 text-white py-3 px-4 rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors duration-300 shadow-lg"
            >
              Exporter en Excel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const Modal = ({ 
    show, 
    onClose, 
    title, 
    employees, 
    type 
  }: { 
    show: boolean; 
    onClose: () => void; 
    title: string; 
    employees: Attendance[]; 
    type: 'present' | 'absent' 
  }) => {
    if (!show) return null;

    const bgColor = type === 'present' ? 'bg-emerald-50' : 'bg-red-50';
    const borderColor = type === 'present' ? 'border-emerald-100' : 'border-red-100';
    const textColor = type === 'present' ? 'text-emerald-900' : 'text-red-900';
    const subTextColor = type === 'present' ? 'text-emerald-600' : 'text-red-600';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div ref={modalRef} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
          <div className={`p-6 ${bgColor} border-b ${borderColor} flex justify-between items-center`}>
            <div className="flex items-center gap-4">
              <Users className={`h-8 w-8 ${subTextColor}`} />
              <div>
                <h2 className={`text-xl font-semibold ${textColor}`}>
                  {title} ({employees.length})
                </h2>
                <p className={`text-sm ${subTextColor}`}>
                  {formatDate(selectedDate)}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className={`${subTextColor} hover:${textColor} transition-colors`}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="p-6">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-emerald-600" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher par nom, prénom ou département..."
                  className="w-full pl-10 p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(80vh-200px)] space-y-4">
              {employees.length > 0 ? (
                employees.map((attendance) => (
                  <div
                    key={attendance.id}
                    className={`${bgColor} p-4 rounded-lg border ${borderColor} transition-all duration-200 hover:shadow-md`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className={`font-semibold ${textColor}`}>
                          {attendance.employee.nom} {attendance.employee.prenom}
                        </h3>
                        <p className={`text-sm ${subTextColor}`}>
                          {attendance.employee.departement}
                        </p>
                      </div>
                      {attendance.schedule && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-emerald-100">
                          <Clock className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm text-emerald-700">
                            {formatTime(attendance.schedule.heure_debut)} - {formatTime(attendance.schedule.heure_fin)}
                          </span>
                        </div>
                      )}
                    </div>
                    {attendance.note && (
                      <p className="text-sm text-gray-600 mt-2 bg-white/50 p-2 rounded">
                        Note: {attendance.note}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className={`text-center py-4 ${subTextColor}`}>
                  Aucun employé {type === 'present' ? 'présent' : 'absent'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#1A4D2E]">
      <NavBar onLogout={onLogout} userRole="observer" />
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-semibold text-emerald-900" style={{ fontFamily: "'Amiri', serif" }}>
              Suivi des Présences
            </h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <FileSpreadsheet size={20} />
                Exporter
              </button>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-6 w-6 text-emerald-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="p-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-emerald-600">
              Chargement...
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              <button
                onClick={() => setShowPresentModal(true)}
                className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <Users className="h-8 w-8 text-emerald-600" />
                  <div>
                    <h2 className="text-xl font-semibold text-emerald-900">
                      Employés Présents ({presentEmployees.length})
                    </h2>
                    <p className="text-sm text-emerald-600">
                      {formatDate(selectedDate)}
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setShowAbsentModal(true)}
                className="bg-red-50 p-6 rounded-xl border border-red-100 hover:bg-red-100 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <Users className="h-8 w-8 text-red-600" />
                  <div>
                    <h2 className="text-xl font-semibold text-red-900">
                      Employés Absents ({absentEmployees.length})
                    </h2>
                    <p className="text-sm text-red-600">
                      {formatDate(selectedDate)}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          )}

          <Modal
            show={showPresentModal}
            onClose={() => {
              setShowPresentModal(false);
              setSearchTerm('');
            }}
            title="Employés Présents"
            employees={presentEmployees}
            type="present"
          />

          <Modal
            show={showAbsentModal}
            onClose={() => {
              setShowAbsentModal(false);
              setSearchTerm('');
            }}
            title="Employés Absents"
            employees={absentEmployees}
            type="absent"
          />

          <ExportModal />
        </div>
      </div>
    </div>
  );
}