import { supabase } from './supabase';

export const clearTables = async () => {
  try {
    // Supprimer d'abord les enregistrements de employee_attendance à cause de la contrainte de clé étrangère
    const { error: attendanceError } = await supabase
      .from('employee_attendance')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Cela correspondra à tous les enregistrements

    if (attendanceError) throw attendanceError;

    // Ensuite supprimer tous les enregistrements de employee_schedules
    const { error: scheduleError } = await supabase
      .from('employee_schedules')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Cela correspondra à tous les enregistrements

    if (scheduleError) throw scheduleError;

    return { success: true, message: 'Les tables ont été vidées avec succès' };
  } catch (error) {
    console.error('Erreur lors de la suppression des données:', error);
    return { success: false, message: error.message };
  }
};