import { getLocalDateString, parseLocalDate } from './dateUtils.js';

/**
 * Cria o calendar de parcelas mensais ausentes, com formato idempotente
 * para o aluno mensal. A rotina devolve entradas pendentes que faltam
 * no histórico de pagamentos e mantém o histórico inteiro preservado.
 */
export const buildMissingMonthlyPaymentHistoryEntries = (student, referenceDate = new Date(), monthsAhead = 12) => {
  const paymentHistory = Array.isArray(student.payment_history) ? student.payment_history : [];
  const paymentDay = Number(student.payment_day || 1);
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  const entries = [];
  for (let index = 0; index < monthsAhead; index += 1) {
    const targetMonth = month + index + 1;
    const targetYear = Math.floor(targetMonth / 12) + year;
    const normalizedMonth = ((targetMonth - 1) % 12) + 1;

    const existing = paymentHistory.some((entry) => {
      return Number(entry.month) === normalizedMonth && Number(entry.year) === targetYear;
    });

    if (!existing) {
      entries.push({
        month: String(normalizedMonth),
        year: String(targetYear),
        status: 'pending',
        amount: Number(student.monthly_payment || 0),
        paid_at: '',
        payment_day: paymentDay,
        payment_method: 'pix',
        period: 'month',
      });
    }
  }

  return entries;
};

export const getWeekStartKey = (value) => {
  const date = value instanceof Date ? value : parseLocalDate(value);
  if (Number.isNaN(date.getTime())) return '';

  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  const weekday = normalized.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  normalized.setDate(normalized.getDate() + mondayOffset);

  return getLocalDateString(normalized);
};

export const getLessonPaymentStatus = (student, lesson) => {
  if (!student) return 'pending';

  if (student.payment_type === 'weekly') {
    const weekStart = getWeekStartKey(lesson?.date || lesson?.lesson_date);
    const history = Array.isArray(student.payment_history) ? student.payment_history : [];
    const paidWeek = history.some((entry) => entry?.period === 'week' && entry?.week_start === weekStart && entry?.status === 'paid');
    return paidWeek ? 'paid' : 'pending';
  }

  return getPaymentStatus(student.next_payment_date, student.last_payment_date);
};

/**
 * Calcula a próxima data de vencimento baseada no dia de pagamento
 * e no histórico de pagamentos do aluno.
 * Varre os meses do histórico para encontrar o próximo não pago.
 */
export const getNextPaymentDate = (paymentDay, paymentStatus = 'pending', paymentHistory = [], referenceDate = new Date()) => {
  const day = Number(paymentDay);
  if (!Number.isFinite(day) || day < 1 || day > 31) {
    return '';
  }

  const baseDate = new Date(referenceDate);
  baseDate.setHours(0, 0, 0, 0);
  
  // Função auxiliar para verificar se um mês está pago
  const isMonthPaid = (month, year) => {
    return paymentHistory.some((entry) => {
      const entryMonth = Number(entry.month);
      const entryYear = Number(entry.year);
      return entryMonth === month && entryYear === year && entry.status === 'paid';
    });
  };

  // Começar a varrer a partir do mês atual
  let currentYear = baseDate.getFullYear();
  let currentMonth = baseDate.getMonth() + 1; // 1-12

  // Limitar a busca a 24 meses à frente para evitar loops infinitos
  for (let i = 0; i < 24; i++) {
    // Verificar se este mês está pago
    const isPaid = isMonthPaid(currentMonth, currentYear);

    if (!isPaid) {
      // Encontrou um mês não pago
      const targetDate = new Date(currentYear, currentMonth - 1, 1);
      const lastDayOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
      const effectiveDay = Math.min(day, lastDayOfMonth);
      const dueDate = new Date(currentYear, currentMonth - 1, effectiveDay);

      // Se a data calculada está no passado, avançar para o próximo mês
      if (dueDate < baseDate) {
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
        continue;
      }

      return getLocalDateString(dueDate);
    }

    // Avançar para o próximo mês
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }

  // Fallback: retornar o próximo mês se todos os meses anteriores estão pagos
  let fallbackYear = currentYear;
  let fallbackMonth = currentMonth;
  const lastDayOfMonth = new Date(fallbackYear, fallbackMonth - 1 + 1, 0).getDate();
  const effectiveDay = Math.min(day, lastDayOfMonth);
  return getLocalDateString(new Date(fallbackYear, fallbackMonth - 1, effectiveDay));
};

/**
 * Calcula o status de pagamento baseado na próxima data de vencimento
 * Se o vencimento é menor que hoje = em atraso = PENDING
 * Se o vencimento é >= hoje = em dia = PAID
 */
export const getPaymentStatus = (nextPaymentDate, lastPaymentDate = null) => {
  if (!nextPaymentDate) {
    return 'pending';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = parseLocalDate(nextPaymentDate);
  dueDate.setHours(0, 0, 0, 0);

  // Se o próximo vencimento é no futuro ou hoje = está em dia
  if (dueDate >= today) {
    return 'paid';
  }

  // Se o próximo vencimento passou = está em atraso
  return 'pending';
};
