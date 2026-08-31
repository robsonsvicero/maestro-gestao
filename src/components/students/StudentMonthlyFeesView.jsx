import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, CheckCircle2, FileText, Lock, ReceiptText } from 'lucide-react';

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function StudentMonthlyFeesView({ student, onBack, onPay, onGenerateReceipt }) {
  const currentYear = new Date().getFullYear();
  const today = new Date();
  const enrollmentDate = student.created_date ? new Date(student.created_date) : new Date();
  const enrollmentMonthStart = new Date(enrollmentDate.getFullYear(), enrollmentDate.getMonth(), 1);
  const currentMonthIndex = today.getMonth();
  const paymentDay = Number(student.payment_day || 0);

  const getDisplayNextPaymentDate = () => {
    if (!paymentDay || paymentDay < 1 || paymentDay > 31) return '';

    const baseDate = student.next_payment_date ? new Date(student.next_payment_date + 'T00:00:00') : new Date();
    if (Number.isNaN(baseDate.getTime())) return '';

    const candidate = new Date(baseDate.getFullYear(), baseDate.getMonth(), paymentDay);
    if (candidate < new Date(student.created_date || new Date().toISOString())) {
      const nextMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
      const lastDayOfMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
      const effectiveDay = Math.min(paymentDay, lastDayOfMonth);
      return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), effectiveDay).toISOString().split('T')[0];
    }

    return candidate.toISOString().split('T')[0];
  };
  const paymentHistory = Array.isArray(student.payment_history) ? student.payment_history : [];
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [generateReceiptAfterPay, setGenerateReceiptAfterPay] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('pix');

  const openPaymentModal = (monthNumber) => {
    setSelectedMonth(monthNumber);
    setGenerateReceiptAfterPay(true);
    setPaymentMethod('pix');
  };

  const confirmPayment = () => {
    if (selectedMonth) {
      onPay(selectedMonth, {
        generateReceipt: generateReceiptAfterPay,
        paymentMethod,
      });
      setSelectedMonth(null);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-[#094C7E] to-[#0A5A94] p-6 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.22em] text-blue-100">Mensalidades</p>
        <h2 className="mt-2 text-3xl font-bold">{student.full_name}</h2>
        <p className="mt-2 text-blue-100">
          {student.monthly_payment ? `Mensalidade: R$ ${Number(student.monthly_payment).toFixed(2)}` : 'Mensalidade não informada'}
        </p>
        {student.next_payment_date && (
          <p className="mt-2 text-sm text-blue-100">
            Próximo vencimento: {new Date(student.next_payment_date + 'T00:00:00').toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {monthNames.map((monthName, index) => {
          const monthNumber = index + 1;
          const monthStart = new Date(currentYear, index, 1);
          const isBeforeEnrollment = monthStart < enrollmentMonthStart;
          const isFutureMonth = monthStart > new Date(currentYear, currentMonthIndex, 1);

          const payment = paymentHistory.find((entry) => Number(entry.month) === monthNumber && Number(entry.year) === currentYear);
          const isPaid = payment?.status === 'paid';
          const isDisabled = isBeforeEnrollment;
          const isFutureFromNextPayment = student.next_payment_date && new Date(student.next_payment_date + 'T00:00:00') >= new Date(currentYear, index, 1, 0, 0, 0) && new Date(student.next_payment_date + 'T00:00:00') < new Date(currentYear, index + 1, 0, 23, 59, 59);

          return (
            <Card
              key={`${student.id}-${monthNumber}`}
              className={`p-4 shadow-sm ${isDisabled ? 'opacity-50' : ''} ${isFutureMonth && !isPaid ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900/60 dark:bg-blue-950/20' : ''}`}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{monthName}</p>
                  <p className="text-xs text-slate-500">{currentYear}</p>
                </div>

                {isPaid && (
                  <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                    Pago
                  </span>
                )}

                {!isPaid && (isFutureMonth || isFutureFromNextPayment) && (
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                    Futuro
                  </span>
                )}

                {!isPaid && !isFutureMonth && !isDisabled && (
                  <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-700">
                    Aberto
                  </span>
                )}
              </div>

              {isBeforeEnrollment && (
                <Button variant="outline" className="w-full" disabled>
                  <Lock className="mr-2 h-4 w-4" />
                  Bloqueado
                </Button>
              )}

              {!isDisabled && isPaid && (
                <Button
                  className="w-full bg-gradient-to-r from-[#094C7E] to-[#0A5A94]"
                  onClick={() => onGenerateReceipt(monthNumber)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Gerar recibo
                </Button>
              )}

              {!isDisabled && !isPaid && (
                <Button
                  className="w-full bg-gradient-to-r from-[#094C7E] to-[#0A5A94]"
                  onClick={() => openPaymentModal(monthNumber)}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {isFutureMonth ? 'Pagar antecipado' : 'Pagar'}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {selectedMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-2 text-[#094C7E] dark:bg-blue-900/40 dark:text-blue-200">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Confirmar pagamento</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {monthNames[selectedMonth - 1]} · {currentYear}
                </h3>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Aluno</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{student.full_name}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Valor</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {student.monthly_payment ? `R$ ${Number(student.monthly_payment).toFixed(2)}` : 'R$ 0,00'}
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Forma de pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-0 transition focus:border-[#094C7E] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="pix">PIX</option>
                <option value="cash">Dinheiro</option>
                <option value="credit_card">Cartão de Crédito</option>
                <option value="debit_card">Cartão de Débito</option>
                <option value="bank_transfer">Transferência Bancária</option>
              </select>
            </div>

            <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <input
                type="checkbox"
                checked={generateReceiptAfterPay}
                onChange={(event) => setGenerateReceiptAfterPay(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#094C7E] focus:ring-[#094C7E]"
              />
              <span className="text-sm text-slate-700 dark:text-slate-200">
                Gerar recibo após confirmação
              </span>
            </label>

            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedMonth(null)}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-gradient-to-r from-[#094C7E] to-[#0A5A94]" onClick={confirmPayment}>
                Confirmar pagamento
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
