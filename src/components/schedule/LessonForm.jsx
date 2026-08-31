import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarCheck } from "lucide-react";

export default function LessonForm({ lesson, students, onSubmit, onCancel, theme, appSettings, defaultDate, defaultStartTime }) {
  const formatDateInput = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    const d = date ? (date instanceof Date ? date : new Date(date + "T00:00:00")) : new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const calculateEndTime = (startTime, durationMinutes) => {
    const [h, m] = startTime.split(':').map(Number);
    const total = h * 60 + m + (durationMinutes || 60);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };

  const initialStartTime = defaultStartTime || "09:00";
  const initialDuration = appSettings?.default_lesson_duration || 60;

  const [formData, setFormData] = useState(lesson || {
    student_id: "",
    student_name: "",
    instrument: "",
    date: formatDateInput(defaultDate),
    start_time: initialStartTime,
    end_time: calculateEndTime(initialStartTime, initialDuration),
    duration: initialDuration,
    status: "scheduled",
    location: "",
    notes: "",
    payment_status: "pending"
  });

  const handleStudentChange = (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      setFormData({
        ...formData,
        student_id: studentId,
        student_name: student.full_name,
        instrument: student.instrument || formData.instrument
      });
    }
  };

  const calculateDuration = (start, end) => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    return (endHour * 60 + endMin) - (startHour * 60 + startMin);
  };

  const handleTimeChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    if (newData.start_time && newData.end_time) {
      newData.duration = calculateDuration(newData.start_time, newData.end_time);
    }
    setFormData(newData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      price: undefined,
    });
  };

  const labelClass = theme === 'dark' ? 'text-slate-200' : '';
  const inputClass = theme === 'dark' ? 'bg-slate-700 border-slate-600 text-slate-100' : '';

  const syncEnabled = appSettings?.sync_with_google_calendar && appSettings?.google_calendar_email;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {syncEnabled && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <CalendarCheck className="w-4 h-4 text-blue-600" />
          <span className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
            Esta aula será sincronizada automaticamente com o Google Calendar
          </span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="student" className={labelClass}>Aluno *</Label>
          <Select
            value={formData.student_id}
            onValueChange={handleStudentChange}
            required
          >
            <SelectTrigger className={inputClass}>
              <SelectValue placeholder="Selecione um aluno" />
            </SelectTrigger>
            <SelectContent>
              {students.map(student => (
                <SelectItem key={student.id} value={student.id}>
                  {student.full_name} - {student.instrument}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="instrument" className={labelClass}>Instrumento *</Label>
          <Input
            id="instrument"
            value={formData.instrument}
            onChange={(e) => setFormData({ ...formData, instrument: e.target.value })}
            placeholder="Ex: Piano, Violão"
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date" className={labelClass}>Data *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status" className={labelClass}>Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger className={inputClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Agendada</SelectItem>
              <SelectItem value="completed">Concluída</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
              <SelectItem value="rescheduled">Remarcada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="start_time" className={labelClass}>Horário de Início *</Label>
          <Input
            id="start_time"
            type="time"
            value={formData.start_time}
            onChange={(e) => handleTimeChange('start_time', e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_time" className={labelClass}>Horário de Término *</Label>
          <Input
            id="end_time"
            type="time"
            value={formData.end_time}
            onChange={(e) => handleTimeChange('end_time', e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration" className={labelClass}>Duração (minutos)</Label>
          <Input
            id="duration"
            type="number"
            value={formData.duration}
            disabled
            className={`${inputClass} bg-slate-100 dark:bg-slate-600`}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location" className={labelClass}>Local</Label>
          <Input
            id="location"
            value={formData.location || ''}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Ex: Sala 1, Online"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_status" className={labelClass}>Pagamento</Label>
          <Select
            value={formData.payment_status}
            onValueChange={(value) => setFormData({ ...formData, payment_status: value })}
          >
            <SelectTrigger className={inputClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className={labelClass}>Observações</Label>
        <Textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Anotações sobre a aula..."
          rows={3}
          className={inputClass}
        />
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94]">
          {lesson ? 'Atualizar' : 'Agendar Aula'}
        </Button>
      </div>
    </form>
  );
}