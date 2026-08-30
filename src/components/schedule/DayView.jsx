import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Sparkles, Music2, Clock, MapPin, Pencil, Trash2, CalendarDays, Utensils } from "lucide-react";
import { format, addDays, subDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const dayKeyMap = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday"
};

const statusConfig = {
  scheduled: { label: "Agendada", class: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200", dot: "bg-blue-500", border: "border-blue-300 dark:border-blue-700" },
  completed: { label: "Concluída", class: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200", dot: "bg-green-500", border: "border-green-300 dark:border-green-700" },
  cancelled: { label: "Cancelada", class: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200", dot: "bg-red-500", border: "border-red-300 dark:border-red-700" },
  rescheduled: { label: "Remarcada", class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200", dot: "bg-yellow-500", border: "border-yellow-300 dark:border-yellow-700" }
};

const paymentStatusConfig = {
  pending: { label: "Pendente", class: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200" },
  paid: { label: "Pago", class: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200" }
};

const HOUR_HEIGHT = 64; // pixels per hour

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

export default function DayView({ lessons, selectedDate, onDateChange, onLessonClick, onDeleteLesson, onStatusChange, onNewLesson, appSettings, isLoading }) {
  const dayKey = dayKeyMap[selectedDate.getDay()];
  const availableHours = appSettings?.available_hours?.[dayKey] || [];

  // Determine the hour range for the timeline
  const { startHour, endHour } = useMemo(() => {
    if (availableHours.length > 0) {
      let min = 24 * 60;
      let max = 0;
      availableHours.forEach(w => {
        min = Math.min(min, timeToMinutes(w.start));
        max = Math.max(max, timeToMinutes(w.end));
      });
      return { startHour: Math.floor(min / 60), endHour: Math.ceil(max / 60) };
    }
    return { startHour: 8, endHour: 18 };
  }, [availableHours]);

  const totalHours = endHour - startHour;

  // Lessons for the selected day
  const dayLessons = useMemo(() =>
    lessons
      .filter(l => isSameDay(new Date(l.date + "T00:00:00"), selectedDate))
      .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "")),
    [lessons, selectedDate]
  );

  // Timed lessons (have a start_time within the timeline range)
  const timedLessons = useMemo(() =>
    dayLessons.filter(l => {
      if (!l.start_time) return false;
      const min = timeToMinutes(l.start_time);
      return min >= startHour * 60 && min < endHour * 60 && l.status !== "cancelled";
    }),
    [dayLessons, startHour, endHour]
  );

  // Unscheduled lessons (no start_time or cancelled)
  const unscheduledLessons = useMemo(() =>
    dayLessons.filter(l => !l.start_time || l.status === "cancelled"),
    [dayLessons]
  );

  // Progress calculation
  const activeLessons = dayLessons.filter(l => l.status !== "cancelled");
  const completedLessons = dayLessons.filter(l => l.status === "completed");
  const totalMinutes = activeLessons.reduce((sum, l) => sum + (l.duration || 0), 0);
  const completedMinutes = completedLessons.reduce((sum, l) => sum + (l.duration || 0), 0);
  const progressPercent = activeLessons.length > 0 ? Math.round((completedLessons.length / activeLessons.length) * 100) : 0;

  const handlePrevDay = () => onDateChange(subDays(selectedDate, 1));
  const handleNextDay = () => onDateChange(addDays(selectedDate, 1));
  const handleToday = () => onDateChange(new Date());

  const hours = Array.from({ length: totalHours + 1 }, (_, i) => startHour + i);

  // Available window background regions
  const availableWindows = availableHours.map((w, idx) => {
    const start = timeToMinutes(w.start);
    const end = timeToMinutes(w.end);
    const top = ((start - startHour * 60) / 60) * HOUR_HEIGHT;
    const height = ((end - start) / 60) * HOUR_HEIGHT;
    return { top, height, idx };
  });

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={handlePrevDay}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday} className="h-9">
            Hoje
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleNextDay}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-baseline gap-3">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 capitalize">
            {format(selectedDate, "EEEE", { locale: ptBR })}
          </h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
      </div>

      {/* Progress Widget */}
      <Card className="shadow-sm bg-white dark:bg-slate-800">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Progresso do dia
            </h3>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {completedLessons.length} de {activeLessons.length} aulas · {progressPercent}%
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#094C7E] to-[#0A5A94] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-2.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Planejado: {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}min</span>
            <span>Concluído: {Math.floor(completedMinutes / 60)}h {completedMinutes % 60}min</span>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="shadow-sm bg-white dark:bg-slate-800">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Timeline
            </h3>
            {onNewLesson && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[#094C7E] border-[#094C7E]/30 hover:bg-[#094C7E]/5"
                onClick={() => onNewLesson("09:00")}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Planejar meu dia
              </Button>
            )}
          </div>

          {isLoading ? (
            <p className="text-center py-12 text-slate-400">Carregando...</p>
          ) : (
            <div className="relative flex">
              {/* Hour labels */}
              <div className="w-16 flex-shrink-0 relative" style={{ height: totalHours * HOUR_HEIGHT }}>
                {hours.map((h, i) => (
                  <div
                    key={h}
                    className="absolute right-3 text-xs font-medium text-slate-400 dark:text-slate-500"
                    style={{ top: i * HOUR_HEIGHT - 7 }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {/* Timeline grid */}
              <div
                className="flex-1 relative border-l border-slate-100 dark:border-slate-700"
                style={{ height: totalHours * HOUR_HEIGHT }}
              >
                {/* Hour grid lines */}
                {hours.map((h, i) => (
                  <div
                    key={`line-${h}`}
                    className="absolute left-0 right-0 border-t border-slate-100 dark:border-slate-700/60"
                    style={{ top: i * HOUR_HEIGHT }}
                  />
                ))}

                {/* Available windows background */}
                {availableWindows.map(w => (
                  <div
                    key={`avail-${w.idx}`}
                    className="absolute left-0 right-0 bg-slate-50/50 dark:bg-slate-700/20"
                    style={{ top: w.top, height: w.height }}
                  />
                ))}

                {/* "Now" indicator */}
                {isSameDay(selectedDate, new Date()) && (() => {
                  const now = new Date();
                  const nowMin = now.getHours() * 60 + now.getMinutes();
                  if (nowMin >= startHour * 60 && nowMin <= endHour * 60) {
                    const top = ((nowMin - startHour * 60) / 60) * HOUR_HEIGHT;
                    return (
                      <div
                        className="absolute left-0 right-0 flex items-center z-20"
                        style={{ top }}
                      >
                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                        <div className="flex-1 h-px bg-red-500" />
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Lesson blocks */}
                {timedLessons.map((lesson, idx) => {
                  const start = timeToMinutes(lesson.start_time);
                  const end = timeToMinutes(lesson.end_time);
                  const top = ((start - startHour * 60) / 60) * HOUR_HEIGHT;
                  const height = Math.max(((end - start) / 60) * HOUR_HEIGHT - 3, 28);
                  const status = statusConfig[lesson.status] || statusConfig.scheduled;

                  return (
                    <div
                      key={lesson.id || idx}
                      className={`absolute left-2 right-2 rounded-lg border-l-4 ${status.border} bg-white dark:bg-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden z-10 ${
                        lesson.status === "cancelled" ? "opacity-50" : ""
                      }`}
                      style={{ top, height }}
                      onClick={() => onLessonClick(lesson)}
                    >
                      <div className="px-3 py-1.5 h-full flex flex-col justify-start">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                            {lesson.student_name}
                          </h4>
                          <Badge className={`${status.class} text-[10px] px-1.5 py-0 h-4`}>
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {lesson.start_time} - {lesson.end_time} · {lesson.instrument}
                        </p>
                        {height > 60 && (
                          <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                            {lesson.location && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" />
                                {lesson.location}
                              </span>
                            )}
                            {lesson.price && (
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                R$ {lesson.price.toFixed(2)}
                              </span>
                            )}
                            {lesson.payment_status && (
                              <Badge className={`${paymentStatusConfig[lesson.payment_status]?.class} text-[10px] px-1 py-0 h-3.5`}>
                                {paymentStatusConfig[lesson.payment_status]?.label}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Empty state inside timeline */}
                {timedLessons.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Music2 className="w-10 h-10 mx-auto mb-2 text-slate-200 dark:text-slate-600" />
                      <p className="text-sm text-slate-400 dark:text-slate-500">
                        Nenhuma aula agendada
                      </p>
                      {onNewLesson && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 text-[#094C7E]"
                          onClick={() => onNewLesson("09:00")}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Agendar aula
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sem horário section */}
      <Card className="shadow-sm bg-white dark:bg-slate-800">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              Sem horário ({unscheduledLessons.length})
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Arraste para a timeline
            </span>
          </div>
          {unscheduledLessons.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">
              Nenhuma aula sem horário
            </p>
          ) : (
            <div className="space-y-2">
              {unscheduledLessons.map((lesson, idx) => {
                const status = statusConfig[lesson.status] || statusConfig.scheduled;
                return (
                  <div
                    key={lesson.id || idx}
                    className={`flex items-center justify-between rounded-lg border-l-4 ${status.border} bg-slate-50 dark:bg-slate-700/40 px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-all`}
                    onClick={() => onLessonClick(lesson)}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${status.dot}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {lesson.student_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {lesson.instrument}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${status.class} text-[10px]`}>
                      {status.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}