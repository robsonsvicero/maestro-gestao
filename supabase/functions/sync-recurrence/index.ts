/// <reference path="../deno.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers });

const toDateString = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const calculateEndTime = (startTime: string, duration = 60) => {
  const [hour, minute] = startTime.split(':').map(Number);
  const totalMinutes = hour * 60 + minute + duration;
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
};

const getLessonDayOfWeek = (lessonDay: string) => {
  if (typeof lessonDay !== 'string') return undefined;

  const normalizedDay = lessonDay
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, '');

  const dayMap: Record<string, number> = {
    domingo: 0, sunday: 0,
    segunda: 1, segundafeira: 1, monday: 1,
    terca: 2, tercafeira: 2, tuesday: 2,
    quarta: 3, quartafeira: 3, wednesday: 3,
    quinta: 4, quintafeira: 4, thursday: 4,
    sexta: 5, sextafeira: 5, friday: 5,
    sabado: 6, saturday: 6,
  };

  return dayMap[normalizedDay];
};

const buildLessonWindowForStudent = (student: any, referenceDate = new Date()) => {
  if (!student || !student.id || !student.lesson_day || !student.lesson_time || student.student_status !== 'active') {
    return [] as Array<Record<string, unknown>>;
  }

  const targetDayOfWeek = getLessonDayOfWeek(student.lesson_day);
  if (targetDayOfWeek === undefined) {
    throw new Error('Dia da aula inválido para o agendamento automático.');
  }

  const firstLessonDate = new Date(referenceDate);
  firstLessonDate.setHours(0, 0, 0, 0);
  firstLessonDate.setDate(firstLessonDate.getDate() + (targetDayOfWeek - firstLessonDate.getDay() + 7) % 7);

  const duration = 60;

  return Array.from({ length: 52 }, (_, week) => {
    const date = new Date(firstLessonDate);
    date.setDate(date.getDate() + week * 7);

    return {
      user_id: student.user_id,
      student_id: student.id,
      student_name: student.full_name,
      date: toDateString(date),
      start_time: student.lesson_time,
      end_time: calculateEndTime(student.lesson_time, duration),
      duration,
      status: 'scheduled',
      instrument: student.instrument,
      payment_status: 'pending',
      notes: `Aula agendada automaticamente para ${student.full_name}`,
    };
  });
};

const buildMissingMonthlyPaymentHistoryEntries = (student: any, referenceDate = new Date(), monthsAhead = 12) => {
  const paymentHistory = Array.isArray(student.payment_history) ? student.payment_history : [];
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  const entries: Array<Record<string, unknown>> = [];
  for (let index = 0; index < monthsAhead; index += 1) {
    const targetMonth = month + index + 1;
    const targetYear = Math.floor(targetMonth / 12) + year;
    const normalizedMonth = ((targetMonth - 1) % 12) + 1;

    const alreadyExists = paymentHistory.some((entry: any) => {
      return Number(entry.month) === normalizedMonth && Number(entry.year) === targetYear;
    });

    if (!alreadyExists) {
      entries.push({
        month: String(normalizedMonth),
        year: String(targetYear),
        status: 'pending',
        amount: Number(student.monthly_payment || 0),
        paid_at: '',
        payment_day: Number(student.payment_day || 1),
        payment_method: 'pix',
        period: 'month',
      });
    }
  }

  return entries;
};

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return reply(500, { error: 'Configuração de ambiente incompleta. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.' });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    const body = await request.json().catch(() => ({}));
    const monthsAhead = Number(body?.monthsAhead ?? 12);
    const now = body?.referenceDate ? new Date(body.referenceDate) : new Date();

    const { data: students, error: studentError } = await admin.from('student').select('*');
    if (studentError) return reply(500, { error: 'Não foi possível listar os alunos.', details: studentError.message });

    const { data: lessons, error: lessonError } = await admin.from('lesson').select('*');
    if (lessonError) return reply(500, { error: 'Não foi possível listar as aulas.', details: lessonError.message });

    const lessonKeys = new Set(
      Array.isArray(lessons)
        ? lessons
            .filter((lesson: any) => lesson?.student_id && lesson?.date)
            .map((lesson: any) => `${lesson.student_id}:${lesson.date}:${lesson.start_time || ''}`)
        : []
    );

    let createdLessons = 0;
    let createdPaymentEntries = 0;
    let updatedStudents = 0;
    let skipped = 0;

    for (const student of Array.isArray(students) ? students : []) {
      if (student.student_status !== 'active' || student.student_state === 'archived') {
        skipped += 1;
        continue;
      }

      if (!student.id || !student.lesson_day || !student.lesson_time) {
        skipped += 1;
        continue;
      }

      try {
        const weekWindow = buildLessonWindowForStudent(student, now);
        const missingLessons = weekWindow.filter((lesson: any) => {
          const key = `${student.id}:${lesson.date}:${lesson.start_time}`;
          return !lessonKeys.has(key);
        });

        if (missingLessons.length > 0) {
          const lessonsToInsert = missingLessons.map((lesson: any) => ({
            ...lesson,
            user_id: student.user_id,
          }));

          const { error: lessonInsertError } = await admin.from('lesson').insert(lessonsToInsert);
          if (lessonInsertError) {
            return reply(500, { error: 'Não foi possível criar as aulas da recorrência.', details: lessonInsertError.message });
          }

          for (const lesson of missingLessons) {
            lessonKeys.add(`${student.id}:${lesson.date}:${lesson.start_time}`);
          }
          createdLessons += missingLessons.length;
        }
      } catch (lessonError) {
        skipped += 1;
      }

      if (student.payment_type === 'monthly' && student.monthly_payment) {
        const schedule = buildMissingMonthlyPaymentHistoryEntries(student, now, monthsAhead);
        if (schedule.length > 0) {
          const history = Array.isArray(student.payment_history) ? [...student.payment_history] : [];
          const historyKeys = new Set(history.map((entry: any) => `${entry.month}:${entry.year}`));
          const missing = schedule.filter((entry: any) => !historyKeys.has(`${entry.month}:${entry.year}`));

          if (missing.length > 0) {
            const nextHistory = [...history, ...missing];
            const { error: updateError } = await admin
              .from('student')
              .update({ payment_history: nextHistory })
              .eq('id', student.id);

            if (updateError) {
              return reply(500, { error: 'Não foi possível atualizar o histórico mensal do aluno.', details: updateError.message });
            }

            createdPaymentEntries += missing.length;
            updatedStudents += 1;
          }
        }
      }
    }

    return reply(200, {
      ok: true,
      createdLessons,
      createdPaymentEntries,
      updatedStudents,
      skipped,
      window: '52-lessons-or-12-months',
    });
  } catch (error: any) {
    return reply(500, { error: 'Erro na sincronização de recorrência.', details: error?.message ?? String(error) });
  }
});
