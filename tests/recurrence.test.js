import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLessonWindowForStudent } from '../src/utils/lessonUtils.js';
import { buildMissingMonthlyPaymentHistoryEntries } from '../src/utils/paymentUtils.js';

test('buildLessonWindowForStudent creates a deterministic 52-week lesson window', () => {
  const lessons = buildLessonWindowForStudent({
    id: 'student-1',
    full_name: 'Aluno Demo',
    lesson_day: 'Segunda-feira',
    lesson_time: '18:00',
    instrument: 'Violão',
    student_status: 'active',
  }, new Date('2026-09-14T00:00:00'));

  assert.equal(lessons.length, 52);
  assert.equal(new Set(lessons.map((lesson) => lesson.date)).size, 52);
  assert.equal(lessons[0].start_time, '18:00');
  assert.equal(lessons[0].status, 'scheduled');
});

test('buildMissingMonthlyPaymentHistoryEntries creates an idempotent pending schedule for the active year', () => {
  const student = {
    payment_type: 'monthly',
    payment_day: 10,
    monthly_payment: 300,
    payment_history: [
      { month: '9', year: '2026', status: 'paid', amount: 300, paid_at: '2026-09-10' },
    ],
  };

  const schedule = buildMissingMonthlyPaymentHistoryEntries(student, new Date('2026-09-14T00:00:00'), 12);

  assert.equal(schedule.length, 11);
  assert.ok(schedule.some((entry) => entry.month === '10' && entry.year === '2026' && entry.status === 'pending'));
  assert.ok(schedule.every((entry) => entry.status === 'pending'));
});
