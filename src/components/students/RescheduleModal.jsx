import { useState } from "react";
import { Clock, CalendarDays, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LESSON_DAYS = [
  { value: "segunda-feira", label: "Segunda-feira" },
  { value: "terça-feira",   label: "Terça-feira" },
  { value: "quarta-feira",  label: "Quarta-feira" },
  { value: "quinta-feira",  label: "Quinta-feira" },
  { value: "sexta-feira",   label: "Sexta-feira" },
  { value: "sábado",        label: "Sábado" },
  { value: "domingo",       label: "Domingo" },
];

export default function RescheduleModal({ student, onConfirm, onClose, isLoading }) {
  const [newDay, setNewDay]   = useState(student.lesson_day  || "");
  const [newTime, setNewTime] = useState(student.lesson_time || "");

  const hasChanges =
    newDay !== (student.lesson_day || "") ||
    newTime !== (student.lesson_time || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newDay || !newTime) return;
    onConfirm(newDay, newTime);
  };

  return (
    /* Overlay */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-white leading-tight">Alterar Horário da Aula</h2>
              <p className="text-blue-100 text-xs truncate max-w-[220px]">{student.full_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-white/70 hover:bg-white/15 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Info atual */}
          {(student.lesson_day || student.lesson_time) && (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
              <p className="font-medium text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-[#094C7E]" />
                Agendamento atual
              </p>
              <p>
                {student.lesson_day || "—"}{student.lesson_time ? ` · ${student.lesson_time}` : ""}
              </p>
            </div>
          )}

          {/* Novo dia */}
          <div className="space-y-2">
            <Label htmlFor="new_lesson_day">Novo dia da semana</Label>
            <Select value={newDay} onValueChange={setNewDay} required>
              <SelectTrigger id="new_lesson_day">
                <SelectValue placeholder="Selecione o dia" />
              </SelectTrigger>
              <SelectContent>
                {LESSON_DAYS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Novo horário */}
          <div className="space-y-2">
            <Label htmlFor="new_lesson_time">Novo horário</Label>
            <Input
              id="new_lesson_time"
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              required
            />
          </div>

          {/* Aviso */}
          {hasChanges && (
            <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Todas as aulas futuras agendadas serão <strong>canceladas</strong> e
                reagendadas para o novo dia e horário selecionados.
              </span>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!newDay || !newTime || !hasChanges || isLoading}
              className="flex-1 bg-gradient-to-r from-[#094C7E] to-[#0A5A94]"
            >
              {isLoading ? "Reagendando..." : "Confirmar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
