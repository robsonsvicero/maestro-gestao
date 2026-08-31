import { Phone, Mail, MapPin, CalendarDays, Music2, Pencil, Trash2, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function StudentCard({
  student,
  onEdit,
  onDelete,
  onOpenMonthlyFees,
}) {
  if (!student) return null;

  const initials = (student.full_name || "Aluno")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";

  const formatDate = (value) => {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-lg transition-all hover:shadow-xl dark:border-slate-700 dark:bg-slate-800">
      <div className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94] p-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-lg font-bold">
              {initials}
            </div>
            <div>
              <h3 className="font-semibold leading-tight">{student.full_name}</h3>
              <p className="text-xs text-blue-100">{student.instrument || "Instrumento não informado"}</p>
            </div>
          </div>
          <div className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wide">
            {student.level || "Iniciante"}
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4 text-sm text-slate-600 dark:text-slate-300">
        {student.monthly_payment && (
          <div className="flex items-center gap-2">
            <span className="text-[#094C7E] font-semibold">Mensalidade:</span>
            <span>R$ {Number(student.monthly_payment).toFixed(2)}</span>
          </div>
        )}

        {(student.payment_status || student.next_payment_date) && (
          <div className="flex items-center gap-2">
            <span className="text-[#094C7E] font-semibold">Pagamento:</span>
            <span className={student.payment_status === 'paid' ? 'text-green-600' : 'text-orange-600'}>
              {student.payment_status === 'paid' ? 'Pago' : 'Pendente'}
            </span>
            {student.next_payment_date && (
              <span className="text-xs text-slate-500">({formatDate(student.next_payment_date)})</span>
            )}
          </div>
        )}

        {student.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-[#094C7E]" />
            <span>{student.phone}</span>
          </div>
        )}

        {student.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-[#094C7E]" />
            <span className="truncate">{student.email}</span>
          </div>
        )}

        {student.address && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#094C7E]" />
            <span className="line-clamp-2">{student.address}</span>
          </div>
        )}

        {(student.lesson_day || student.lesson_time) && (
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#094C7E]" />
            <span>
              {student.lesson_day || "Agenda disponível"}
              {student.lesson_time ? ` · ${student.lesson_time}` : ""}
            </span>
          </div>
        )}

        {student.notes && (
          <div className="rounded-lg bg-slate-100 p-2 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            <div className="mb-1 flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
              <Music2 className="h-3.5 w-3.5 text-[#094C7E]" />
              Observações
            </div>
            <p>{student.notes}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-700">
        <Button variant="outline" size="sm" onClick={onOpenMonthlyFees}>
          <CheckCircle className="mr-2 h-4 w-4" />
          Mensalidades
        </Button>
        
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir
        </Button>
      </div>
    </Card>
  );
}