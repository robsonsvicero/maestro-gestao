import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, List, CalendarDays } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

import LessonForm from "../components/schedule/LessonForm";
import CalendarView from "../components/schedule/CalendarView";
import ListView from "../components/schedule/ListView";
import DayView from "../components/schedule/DayView";

export default function Schedule() {
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState("day");
  const [prefilledStartTime, setPrefilledStartTime] = useState(null);
  const queryClient = useQueryClient();

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['lessons'],
    queryFn: () => base44.entities.Lesson.list('-date'),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const settings = appSettings[0] || {};

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const lesson = await base44.entities.Lesson.create(data);
      
      // Sync with Google Calendar if enabled
      if (settings.sync_with_google_calendar && settings.google_calendar_email) {
        try {
          const student = students.find(s => s.id === data.student_id);

          const eventDescription = `
Aula de ${data.instrument}
Aluno: ${data.student_name}
${data.location ? `Local: ${data.location}` : ''}
${data.notes ? `Observações: ${data.notes}` : ''}
${data.price ? `Valor: R$ ${data.price.toFixed(2)}` : ''}
          `.trim();

          // Send event to teacher's calendar
          await base44.integrations.Core.SendEmail({
            from_name: settings.school_name || "Sistema",
            to: settings.google_calendar_email,
            subject: `Aula Agendada - ${data.student_name} - ${format(new Date(data.date), 'dd/MM/yyyy')} ${data.start_time}`,
            body: `${eventDescription}\n\nEvento do Google Calendar será criado automaticamente.`
          });

          // If student has email, send to their calendar too
          if (student?.email) {
            await base44.integrations.Core.SendEmail({
              from_name: settings.school_name || "Escola de Música",
              to: student.email,
              subject: `Aula Agendada - ${data.instrument}`,
              body: `
Olá ${data.student_name},

Sua aula foi agendada com sucesso!

${eventDescription}

Nos vemos em breve!
              `
            });
          }
        } catch (error) {
          console.error("Error syncing with Google Calendar:", error);
        }
      }
      
      return lesson;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lessons']);
      setShowForm(false);
      setEditingLesson(null);
      setPrefilledStartTime(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lesson.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lessons']);
      setShowForm(false);
      setEditingLesson(null);
      setPrefilledStartTime(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Lesson.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['lessons']);
    },
  });

  const handleSubmit = (data) => {
    if (editingLesson) {
      updateMutation.mutate({ id: editingLesson.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);
    setPrefilledStartTime(null);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir esta aula?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleStatusChange = (lesson, newStatus) => {
    updateMutation.mutate({ id: lesson.id, data: { ...lesson, status: newStatus } });
  };

  const handleNewLessonAtTime = (startTime) => {
    setEditingLesson(null);
    setPrefilledStartTime(startTime);
    setShowForm(true);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-slate-900 dark:text-slate-100">
            Agenda
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gerencie suas aulas e horários
          </p>
        </div>
        <Button 
          onClick={() => {
            setEditingLesson(null);
            setPrefilledStartTime(null);
            setShowForm(!showForm);
          }}
          className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94] hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Aula
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 shadow-xl bg-white dark:bg-slate-800">
          <LessonForm
            lesson={editingLesson}
            students={students}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingLesson(null);
              setPrefilledStartTime(null);
            }}
            appSettings={settings}
            defaultDate={selectedDate}
            defaultStartTime={prefilledStartTime}
          />
        </Card>
      )}

      <Tabs value={view} onValueChange={setView}>
        <TabsList className="bg-white dark:bg-slate-800 border dark:border-slate-700">
          <TabsTrigger value="day" className="data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-700">
            <CalendarDays className="w-4 h-4 mr-2" />
            Dia
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-700">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Mês
          </TabsTrigger>
          <TabsTrigger value="list" className="data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-700">
            <List className="w-4 h-4 mr-2" />
            Lista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <CalendarView
            lessons={lessons}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onLessonClick={handleEdit}
            onDeleteLesson={handleDelete}
            onStatusChange={handleStatusChange}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="day" className="mt-6">
          <DayView
            lessons={lessons}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onLessonClick={handleEdit}
            onDeleteLesson={handleDelete}
            onStatusChange={handleStatusChange}
            onNewLesson={handleNewLessonAtTime}
            appSettings={settings}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <ListView
            lessons={lessons}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}