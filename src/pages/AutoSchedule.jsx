import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Send, Sparkles } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getPaymentStatus } from "@/utils/paymentUtils";

import ScheduleSuggestions from "../components/schedule/ScheduleSuggestions";
import StudentSelector from "../components/schedule/StudentSelector";

export default function AutoSchedule() {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const queryClient = useQueryClient();

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('student').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons'],
    queryFn: async () => {
      const { data, error } = await supabase.from('lesson').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('*');
      if (error) throw error;
      return data;
    },
  });

  const settings = appSettings[0] || {};

  const createLessonMutation = useMutation({
    mutationFn: async (lessonData) => {
      const { data: lesson, error } = await supabase
        .from('lesson')
        .insert(lessonData)
        .select()
        .single();
      if (error) throw error;

      // Send email notification to student
      if (selectedStudent.email) {
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            from_name: settings.professional_name || "Profissional",
            to: selectedStudent.email,
            subject: "Aula Agendada - Confirmação",
            body: `
              Olá ${selectedStudent.full_name},

              Sua aula foi agendada com sucesso!

              Detalhes:
              - Instrumento: ${lessonData.instrument}
              - Data: ${format(new Date(lessonData.date), "dd/MM/yyyy")}
              - Horário: ${lessonData.start_time} - ${lessonData.end_time}
              ${lessonData.location ? `- Local: ${lessonData.location}` : ''}

              Nos vemos em breve!

              ${settings.professional_name || "Profissional"}
            `
          }
        });
        if (emailError) console.error("Erro ao enviar email ao aluno:", emailError);
      }

      // Send email notification to teacher
      if (settings.admin_email) {
        const { error: adminEmailError } = await supabase.functions.invoke('send-email', {
          body: {
            from_name: settings.professional_name || "Sistema",
            to: settings.admin_email,
            subject: "Nova Aula Agendada",
            body: `
              Nova aula agendada:

              Aluno: ${selectedStudent.full_name}
              Instrumento: ${lessonData.instrument}
              Data: ${format(new Date(lessonData.date), "dd/MM/yyyy")}
              Horário: ${lessonData.start_time} - ${lessonData.end_time}
              ${lessonData.location ? `Local: ${lessonData.location}` : ''}
            `
          }
        });
        if (adminEmailError) console.error("Erro ao enviar email ao admin:", adminEmailError);
      }

      return lesson;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      setSelectedStudent(null);
      setSelectedSlot(null);
      setIsScheduling(false);
    },
    onError: () => {
      setIsScheduling(false);
    },
  });

  const handleConfirmSchedule = async () => {
    if (!selectedStudent || !selectedSlot) return;

    setIsScheduling(true);

    const lessonData = {
      student_id: selectedStudent.id,
      student_name: selectedStudent.full_name,
      instrument: selectedStudent.instrument,
      date: format(selectedSlot.date, 'yyyy-MM-dd'),
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
      duration: settings.default_lesson_duration || 60,
      status: "scheduled",
      payment_status: getPaymentStatus(selectedStudent.next_payment_date, selectedStudent.last_payment_date)
    };

    createLessonMutation.mutate(lessonData);
  };

  const getAvailableSlots = () => {
    if (!selectedStudent || !settings.available_hours) return [];

    const slots = [];
    const startDate = startOfWeek(new Date(), { locale: ptBR });
    const duration = settings.default_lesson_duration || 60;

    // Get next 4 weeks
    for (let week = 0; week < 4; week++) {
      for (let day = 0; day < 7; day++) {
        const currentDate = addDays(startDate, week * 7 + day);
        const dayName = format(currentDate, 'EEEE', { locale: ptBR }).toLowerCase();

        // Map Portuguese day names to English
        const dayMap = {
          'domingo': 'sunday',
          'segunda-feira': 'monday',
          'terça-feira': 'tuesday',
          'quarta-feira': 'wednesday',
          'quinta-feira': 'thursday',
          'sexta-feira': 'friday',
          'sábado': 'saturday'
        };

        const dayKey = dayMap[dayName];
        const availableHours = settings.available_hours?.[dayKey] || [];

        availableHours.forEach(slot => {
          const [startHour, startMin] = slot.start.split(':').map(Number);
          const [endHour, endMin] = slot.end.split(':').map(Number);

          let currentTime = startHour * 60 + startMin;
          const endTime = endHour * 60 + endMin;

          while (currentTime + duration <= endTime) {
            const hours = Math.floor(currentTime / 60);
            const minutes = currentTime % 60;
            const start_time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

            const endMinutes = currentTime + duration;
            const endHours = Math.floor(endMinutes / 60);
            const endMins = endMinutes % 60;
            const end_time = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

            // Check if this slot is already booked
            const isBooked = lessons.some(lesson => 
              isSameDay(new Date(lesson.date), currentDate) &&
              lesson.start_time === start_time &&
              lesson.status !== 'cancelled'
            );

            if (!isBooked && currentDate > new Date()) {
              slots.push({
                date: currentDate,
                start_time,
                end_time,
                dayName: format(currentDate, 'EEEE', { locale: ptBR })
              });
            }

            currentTime += duration;
          }
        });
      }
    }

    return slots;
  };

  const availableSlots = getAvailableSlots();

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-slate-900 dark:text-slate-100">
          <Sparkles className="w-8 h-8 inline-block mr-2 text-[#094C7E]" />
          Agendamento Automático
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Agende aulas automaticamente com base na disponibilidade
        </p>
      </div>

      {!settings.available_hours && (
        <Card className="shadow-xl border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="p-6">
            <p className="text-yellow-800 dark:text-yellow-200">
              ⚠️ Configure seus horários disponíveis nas Configurações para usar o agendamento automático.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <StudentSelector
          students={students}
          selectedStudent={selectedStudent}
          onSelectStudent={setSelectedStudent}
        />

        {selectedStudent && (
          <Card className="shadow-xl bg-white dark:bg-slate-800">
            <CardHeader className="border-b dark:border-slate-700">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <User className="w-5 h-5 text-[#094C7E]" />
                Aluno Selecionado
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div>
                  <p className="font-bold text-lg text-slate-900 dark:text-slate-100">
                    {selectedStudent.full_name}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {selectedStudent.instrument} - {selectedStudent.level === 'iniciante' ? 'Iniciante' : selectedStudent.level === 'intermediário' ? 'Intermediário' : 'Avançado'}
                  </p>
                </div>
                {selectedStudent.lesson_day && (
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    <strong>Preferência:</strong> {selectedStudent.lesson_day} 
                    {selectedStudent.lesson_time && ` às ${selectedStudent.lesson_time}`}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedStudent && settings.available_hours && (
        <ScheduleSuggestions
          slots={availableSlots}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
        />
      )}

      {selectedSlot && (
        <Card className="shadow-xl border-2 border-[#094C7E] bg-white dark:bg-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold mb-2 text-slate-900 dark:text-slate-100">
                  Confirmar Agendamento
                </p>
                <div className="flex gap-4 text-sm">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(selectedSlot.date, "dd/MM/yyyy")} - {selectedSlot.dayName}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {selectedSlot.start_time} - {selectedSlot.end_time}
                  </Badge>
                </div>
              </div>
              <Button
                onClick={handleConfirmSchedule}
                disabled={isScheduling || createLessonMutation.isPending}
                className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94]"
              >
                <Send className="w-4 h-4 mr-2" />
                {isScheduling ? 'Agendando...' : 'Confirmar e Notificar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
