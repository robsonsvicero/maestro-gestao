import { buildLessonWindowForStudent } from './lessonUtils.js';
import { buildMissingMonthlyPaymentHistoryEntries } from './paymentUtils.js';
import { getLocalDateString } from './dateUtils.js';

/**
 * Orquestra a recorrência mínima de aulas e parcelas de forma idempotente.
 * Regras:
 * - só alunos com student_status = 'active' entram na recorrência;
 * - alunos com student_state = 'archived' saem da recorrência;
 * - aulas são protegidas por data e student_id, sem duplicar no mesmo bloco;
 * - parcelas são criadas apenas se o mês/ano não existir no payment_history.
 */
export const ensureRecurrenceForActiveStudents = async ({
  students,
  lessons,
  lessonsClient,
  studentsClient,
  studentsById = new Map(),
  now = new Date(),
} = {}) => {
  if (!Array.isArray(students) || students.length === 0) {
    return { createdLessons: 0, createdPaymentEntries: 0, updatedStudents: 0, skipped: 0 };
  }

  let createdLessons = 0;
  let createdPaymentEntries = 0;
  let updatedStudents = 0;
  let skipped = 0;

  const lessonKeys = new Set(
    Array.isArray(lessons)
      ? lessons
          .filter((lesson) => lesson?.student_id && lesson?.date)
          .map((lesson) => `${lesson.student_id}:${lesson.date}:${lesson.start_time || ''}`)
      : []
  );

  const paidMonthKeys = new Set(
    students.flatMap((student) => {
      const history = Array.isArray(student.payment_history) ? student.payment_history : [];
      return history.map((entry) => `${student.id}:${entry.month}:${entry.year}:${entry.status || 'pending'}`);
    })
  );

  for (const student of students) {
    if (student.student_status !== 'active' || student.student_state === 'archived') {
      skipped += 1;
      continue;
    }

    if (!student.id || !student.lesson_day || !student.lesson_time) {
      skipped += 1;
      continue;
    }

    const missingLessonWindow = buildLessonWindowForStudent(student, now);
    const missingLessonPayload = missingLessonWindow.filter((lesson) => {
      const lessonKey = `${student.id}:${lesson.date}:${lesson.start_time}`;
      return !lessonKeys.has(lessonKey);
    });

    if (missingLessonPayload.length > 0 && lessonsClient) {
      for (const lesson of missingLessonPayload) {
        const created = await lessonsClient.create(lesson);
        if (created) {
          createdLessons += 1;
          lessonKeys.add(`${student.id}:${lesson.date}:${lesson.start_time}`);
        }
      }
    }

    if (student.payment_type === 'monthly' && student.monthly_payment && studentsClient) {
      const paymentEntries = buildMissingMonthlyPaymentHistoryEntries(student, now, 12);
      const paymentEntriesToPersist = paymentEntries.filter((entry) => {
        const key = `${student.id}:${entry.month}:${entry.year}:${entry.status}`;
        return !paidMonthKeys.has(key);
      });

      if (paymentEntriesToPersist.length > 0) {
        const mergedHistory = Array.isArray(student.payment_history) ? [...student.payment_history] : [];
        const nextHistory = [...mergedHistory, ...paymentEntriesToPersist];

        await studentsClient.update(student.id, {
          payment_history: nextHistory,
        });

        createdPaymentEntries += paymentEntriesToPersist.length;
        updatedStudents += 1;

        for (const entry of paymentEntriesToPersist) {
          paidMonthKeys.add(`${student.id}:${entry.month}:${entry.year}:${entry.status}`);
        }
      }
    }
  }

  return {
    createdLessons,
    createdPaymentEntries,
    updatedStudents,
    skipped,
  };
};

/**
 * Convenience helper for the browser/front environment, using base44 style API.
 * This helper keeps the same external contract and is easy to consume from a page.
 */
export const ensureRecurrenceForActiveStudentsFromBase44 = async ({
  base44,
  students = [],
  now = new Date(),
}) => {
  if (!base44?.entities?.Lesson?.create || !base44?.entities?.Student?.update || !base44?.entities?.Student?.list) {
    throw new Error('base44.entities.Lesson.create, Lesson.list e Student.update são obrigatórios para orquestrar recorrência.');
  }

  const lessons = await base44.entities.Lesson.list();
  const result = await ensureRecurrenceForActiveStudents({
    students,
    lessons,
    lessonsClient: base44.entities.Lesson,
    studentsClient: base44.entities.Student,
    now,
  });

  return result;
};

/**
 * Small calendar read for UI screens if needed.
 */
export const getRecurrenceHealth = (students = [], now = new Date()) => {
  const active = students.filter((student) => student.student_status === 'active' && student.student_state !== 'archived');
  const nextMonthHuman = `${getLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 1))}`;

  return {
    activeCount: active.length,
    nextMonth: nextMonthHuman,
  };
};
