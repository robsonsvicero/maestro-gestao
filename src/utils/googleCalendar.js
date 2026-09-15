import { supabase } from '@/lib/supabaseClient';

export async function createGoogleCalendarEvent({ calendarId, lesson, professionalName }) {
  if (!calendarId || !lesson?.date || !lesson?.start_time || !lesson?.end_time) {
    throw new Error('Dados insuficientes para criar o evento no Google Calendar.');
  }

  const { data, error } = await supabase.functions.invoke('google-calendar-event', {
    body: {
      calendarId,
      professionalName,
      lesson: {
        studentName: lesson.student_name,
        instrument: lesson.instrument,
        date: lesson.date,
        startTime: lesson.start_time,
        endTime: lesson.end_time,
        location: lesson.location,
        notes: lesson.notes,
      },
    },
  });

  if (error) throw error;

  if (lesson.id && data?.eventId) {
    const { error: updateError } = await supabase
      .from('lesson')
      .update({
        google_calendar_event_id: data.eventId,
        google_calendar_sync_status: 'synced',
        google_calendar_sync_error: null,
      })
      .eq('id', lesson.id);

    if (updateError) console.error('Erro ao registrar evento do Google Calendar:', updateError);
  }

  return data;
}

export async function syncPendingGoogleCalendarLessons() {
  const { data, error } = await supabase.functions.invoke('sync-google-calendar');
  if (error) throw error;
  return data;
}
