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
 * Gera 52 agendamentos semanais para um aluno ativo.
 * @returns {Promise<Array>} Aulas criadas
 */
export const generateAutomaticLessons = async (student, base44) => {
  if (!student.id || !student.lesson_day || !student.lesson_time || student.student_status !== 'active') {
    return [];
  }

  const targetDayOfWeek = getLessonDayOfWeek(student.lesson_day);

  if (targetDayOfWeek === undefined) {
    throw new Error('Dia da aula inválido para o agendamento automático.');
  }

  const firstLessonDate = new Date();
  firstLessonDate.setHours(0, 0, 0, 0);
  firstLessonDate.setDate(firstLessonDate.getDate() + (targetDayOfWeek - firstLessonDate.getDay() + 7) % 7);

  const duration = 60;
  const lessons = Array.from({ length: 52 }, (_, week) => {
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

  const createdLessons = await Promise.all(lessons.map(async (lesson) => {
    const created = await base44.entities.Lesson.create(lesson);
    if (!created) throw new Error('Não foi possível criar uma das aulas automáticas.');
    return created;
  }));

  return createdLessons;
};

/** Deleta todas as aulas futuras de um aluno. */
export const deleteFutureLessons = async (studentId, base44) => {
  try {
    const lessons = await base44.entities.Lesson.list();
    if (!Array.isArray(lessons)) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureLessons = lessons.filter((lesson) => {
      const lessonDate = lesson.date || lesson.lesson_date;
      if (lesson.student_id !== studentId || !lessonDate) return false;
      return new Date(`${lessonDate}T00:00:00`) >= today;
    });

    await Promise.all(futureLessons.map((lesson) => base44.entities.Lesson.delete(lesson.id)));
    return futureLessons.length;
  } catch (error) {
    console.error('Erro ao buscar aulas para deletar:', error);
    return 0;
  }
};
