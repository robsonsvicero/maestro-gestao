import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, CheckCircle2, ReceiptText, FileText } from 'lucide-react';

const getLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfWeek = (date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
};

const formatWeek = (date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export default function StudentWeeklyFeesView({ student, onBack, onPay, onGenerateReceipt }) {
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [generateReceiptAfterPay, setGenerateReceiptAfterPay] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [weeks, setWeeks] = useState([]);

  useEffect(() => {
    const firstWeek = startOfWeek(student.created_date ? new Date(student.created_date) : new Date());
    const currentWeek = startOfWeek(new Date());
    const start = firstWeek < currentWeek ? firstWeek : currentWeek;
    setWeeks(Array.from({ length: 12 }, (_, index) => {
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() + index * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return { weekStart: getLocalDate(weekStart), weekEnd: getLocalDate(weekEnd), weekStartDate: weekStart };
    }));
  }, [student.created_date]);

  const paymentHistory = Array.isArray(student.payment_history) ? student.payment_history : [];
  const openPaymentModal = (week) => {
    setSelectedWeek(week);
    setGenerateReceiptAfterPay(true);
    setPaymentMethod('pix');
  };

  const confirmPayment = () => {
    if (!selectedWeek) return;
    onPay(selectedWeek, { generateReceipt: generateReceiptAfterPay, paymentMethod });
    setSelectedWeek(null);
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
      </div>
      <div className="rounded-2xl bg-gradient-to-r from-[#094C7E] to-[#0A5A94] p-6 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.22em] text-blue-100">Pagamentos semanais</p>
        <h2 className="mt-2 text-3xl font-bold">{student.full_name}</h2>
        <p className="mt-2 text-blue-100">Valor por aula: R$ {Number(student.weekly_payment || 0).toFixed(2)}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {weeks.map((week) => {
          const payment = paymentHistory.find((entry) => entry.week_start === week.weekStart);
          const isPaid = payment?.status === 'paid';
          return (
            <Card key={week.weekStart} className="p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div><p className="text-lg font-semibold">Semana</p><p className="text-xs text-slate-500">{formatWeek(week.weekStartDate)} a {formatWeek(new Date(`${week.weekEnd}T00:00:00`))}</p></div>
                {isPaid ? <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-semibold uppercase text-green-700">Pago</span> : <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-semibold uppercase text-orange-700">Aberto</span>}
              </div>
              {isPaid ? (
                <Button className="w-full bg-gradient-to-r from-[#094C7E] to-[#0A5A94]" onClick={() => onGenerateReceipt(week)}><FileText className="mr-2 h-4 w-4" />Gerar recibo</Button>
              ) : (
                <Button className="w-full bg-gradient-to-r from-[#094C7E] to-[#0A5A94]" onClick={() => openPaymentModal(week)}><CheckCircle2 className="mr-2 h-4 w-4" />Registrar pagamento</Button>
              )}
            </Card>
          );
        })}
      </div>
      {selectedWeek && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-3"><ReceiptText className="h-5 w-5 text-[#094C7E]" /><div><p className="text-sm text-slate-500">Confirmar pagamento</p><h3 className="text-xl font-bold">Semana de {formatWeek(selectedWeek.weekStartDate)}</h3></div></div>
            <p className="mb-4 text-sm text-slate-500">Valor: R$ {Number(student.weekly_payment || 0).toFixed(2)}</p>
            <label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={generateReceiptAfterPay} onChange={(event) => setGenerateReceiptAfterPay(event.target.checked)} />Gerar recibo após o pagamento</label>
            <select className="mb-6 w-full rounded-md border p-2" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="pix">PIX</option><option value="cash">Dinheiro</option><option value="credit_card">Cartão de crédito</option><option value="debit_card">Cartão de débito</option></select>
            <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setSelectedWeek(null)}>Cancelar</Button><Button onClick={confirmPayment} className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94]">Confirmar</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
