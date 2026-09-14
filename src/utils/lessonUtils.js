/**
 * Formata uma data localmente para o campo `date` da tabela lesson.
 * Evita que a conversão UTC altere o dia em fusos horários diferentes.
 */
const toDateString = (date) => {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const calculateEndTime = (startTime, duration = 60) => {
  const [hour, minute] = startTime.split(':').map(Number);
  const totalMinutes = hour * 60 + minute + duration;
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
};

/** Converts Portuguese or English weekday names to the JavaScript weekday. */
export const getLessonDayOfWeek = (lessonDay) => {
  if (typeof lessonDay !== 'string') return undefined;

  const normalizedDay = lessonDay
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, '');

  const dayMap = {
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

/**
 * Constrói o bloco determinístico de 52 aulas futuras.
 * Mantém a regra de idempotência: o método não grava; apenas
 * fornece o lote a ser persistido pela rotina de sincronização.
 */
export const buildLessonWindowForStudent = (student, referenceDate = new Date()) => {
  if (!student || !student.id || !student.lesson_day || !student.lesson_time || student.student_status !== 'active') {
    return [];
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

/**
 * Gera 52 agendamentos semanais para um aluno ativo.
 * @returns {Promise<Array>} Aulas criadas
 */
export const generateAutomaticLessons = async (student, base44) => {
  if (!student.id || !student.lesson_day || !student.lesson_time || student.student_status !== 'active') {
    return [];
  }

  const lessons = buildLessonWindowForStudent(student, new Date());
  if (lessons.length === 0) {
    return [];
  }

  const createdLessons = await Promise.all(lessons.map(async (lesson) => {
    const created = await base44.entities.Lesson.create(lesson);
    if (!created) throw new Error('Não foi possível criar uma das aulas automáticas.');
    return created;
  }));

  return createdLessons;
};

/** Deleta todas as aulas de um aluno, futuras ou passadas. */
export const deleteStudentLessons = async (studentId, base44) => {
  try {
    const lessons = await base44.entities.Lesson.list();
    if (!Array.isArray(lessons)) return 0;

    const matchingLessons = lessons.filter((lesson) => lesson.student_id === studentId);
    await Promise.all(matchingLessons.map((lesson) => base44.entities.Lesson.delete(lesson.id)));
    return matchingLessons.length;
  } catch (error) {
    console.error('Erro ao buscar aulas para deletar:', error);
    return 0;
  }
};

export const filterFutureLessonsForStudent = (studentId, lessons, referenceDate = new Date()) => {
  if (!Array.isArray(lessons)) return [];

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  return lessons.filter((lesson) => {
    const lessonDate = lesson.date || lesson.lesson_date;
    if (lesson.student_id !== studentId || !lessonDate) return false;
    return new Date(`${lessonDate}T00:00:00`) >= today;
  });
};

/** Deleta todas as aulas futuras de um aluno. */
export const deleteFutureLessons = async (studentId, base44) => {
  try {
    const lessons = await base44.entities.Lesson.list();
    if (!Array.isArray(lessons)) return 0;

    const futureLessons = filterFutureLessonsForStudent(studentId, lessons);

    await Promise.all(futureLessons.map((lesson) => base44.entities.Lesson.delete(lesson.id)));
    return futureLessons.length;
  } catch (error) {
    console.error('Erro ao buscar aulas para deletar:', error);
    return 0;
  }
};

/**
 * Reagenda as aulas futuras de um aluno para um novo dia e/ou horário.
 * Deleta as aulas futuras existentes, cria novas no novo padrão e atualiza o aluno.
 * @param {Object} student - Dados atuais do aluno
 * @param {string} newLessonDay - Novo dia da semana (ex: "segunda-feira")
 * @param {string} newLessonTime - Novo horário (ex: "14:30")
 * @param {Object} base44 - Cliente base44
 * @returns {Promise<{deletedCount: number, createdCount: number}>}
 */
export const rescheduleFutureLessons = async (student, newLessonDay, newLessonTime, base44) => {
  const targetDayOfWeek = getLessonDayOfWeek(newLessonDay);
  if (targetDayOfWeek === undefined) {
    throw new Error('Dia da aula inválido para o reagendamento.');
  }

  // 1. Deletar aulas futuras existentes
  const deletedCount = await deleteFutureLessons(student.id, base44);

  // 2. Calcular a data da próxima ocorrência do novo dia da semana
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilNext = (targetDayOfWeek - today.getDay() + 7) % 7;
  const firstLessonDate = new Date(today);
  firstLessonDate.setDate(today.getDate() + daysUntilNext);

  // 3. Gerar 52 aulas a partir do novo padrão
  const newLessons = buildLessonWindowForStudent(
    {
      ...student,
      lesson_day: newLessonDay,
      lesson_time: newLessonTime,
      student_status: 'active',
    },
    firstLessonDate,
  );

  const createdLessons = await Promise.all(
    newLessons.map(async (lesson) => {
      const created = await base44.entities.Lesson.create(lesson);
      if (!created) throw new Error('Não foi possível criar uma das aulas no reagendamento.');
      return created;
    }),
  );

  // 4. Atualizar apenas os campos lesson_day e lesson_time no aluno.
  // IMPORTANTE: não incluir 'id', 'created_at', 'updated_at' etc no payload,
  // pois o Supabase rejeita silenciosamente atualizações que incluem a PK.
  const updatePayload = {
    lesson_day: newLessonDay,
    lesson_time: newLessonTime,
  };

  const updated = await base44.entities.Student.update(student.id, updatePayload);
  if (!updated) {
    console.error('Student.update retornou null — verifique as políticas RLS da tabela student no Supabase.');
    throw new Error('Não foi possível atualizar o dia/horário do aluno. Verifique as permissões no Supabase.');
  }

  return { deletedCount, createdCount: createdLessons.length };
};
