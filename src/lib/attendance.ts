import { supabase } from './supabase';

interface AttendanceData {
  employee_id: string;
  date: string;
  is_present: boolean;
  note?: string | null;
}

export async function saveAttendance(data: AttendanceData) {
  try {
    const { error } = await supabase
      .from('employee_attendance')
      .upsert(
        {
          employee_id: data.employee_id,
          date: data.date,
          is_present: data.is_present,
          note: data.note
        },
        {
          onConflict: 'employee_id,date'
        }
      );

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la présence:', error);
    return {
      success: false,
      message: error.message || 'Une erreur est survenue lors de la sauvegarde'
    };
  }
}

export async function getAttendance(employee_id: string, date: string) {
  try {
    const { data, error } = await supabase
      .from('employee_attendance')
      .select('*')
      .eq('employee_id', employee_id)
      .eq('date', date)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de la récupération de la présence:', error);
    return {
      success: false,
      message: error.message || 'Une erreur est survenue lors de la récupération'
    };
  }
}

export async function markEmployeeAbsent(employee_id: string, date: string) {
  return saveAttendance({
    employee_id,
    date,
    is_present: false
  });
}

export async function markEmployeePresent(employee_id: string, date: string) {
  return saveAttendance({
    employee_id,
    date,
    is_present: true
  });
}