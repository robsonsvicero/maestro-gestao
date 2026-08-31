import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Music2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

import LessonCard from "./LessonCard";

export default function CalendarView({ lessons, selectedDate, onDateChange, onLessonClick, onDeleteLesson, onStatusChange, theme, isLoading: _isLoading }) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getLessonsForDay = (day) => {
    return lessons.filter(lesson => 
      isSameDay(new Date(lesson.date + "T00:00:00"), day)
    );
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onDateChange(today);
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Get the day of week for the first day of the month (0 = Sunday)
  const firstDayOfWeek = monthStart.getDay();

  // Create empty cells for days before the month starts
  const emptyDays = Array(firstDayOfWeek).fill(null);

  return (
    <div className="space-y-6">
      <Card className={`backdrop-blur-xl shadow-xl ${
        theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-white/60 border-slate-200'
      }`}>
        <CardHeader className={`border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex justify-between items-center">
            <CardTitle className={theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}>
              {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleToday}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((day, index) => (
              <div
                key={index}
                className={`text-center text-sm font-semibold p-2 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty cells before month starts */}
            {emptyDays.map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square" />
            ))}

            {/* Days of the month */}
            {daysInMonth.map((day) => {
              const dayLessons = getLessonsForDay(day);
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDate);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => onDateChange(day)}
                  className={`aspect-square p-2 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-[#094C7E] bg-[#094C7E] text-white'
                      : isToday
                      ? theme === 'dark'
                        ? 'border-blue-500 bg-slate-700'
                        : 'border-blue-500 bg-blue-50'
                      : theme === 'dark'
                      ? 'border-slate-700 hover:bg-slate-700'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isSelected ? 'text-white' : theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  {dayLessons.length > 0 && (
                    <div className="flex justify-center">
                      <div className={`text-xs px-1 rounded ${
                        isSelected 
                          ? 'bg-white/20 text-white' 
                          : 'bg-[#094C7E] text-white'
                      }`}>
                        {dayLessons.length}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lessons for selected day */}
      <Card className={`backdrop-blur-xl shadow-xl ${
        theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-white/60 border-slate-200'
      }`}>
        <CardHeader className={`border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
          <CardTitle className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
            <Music2 className="w-5 h-5 text-[#094C7E]" />
            Aulas de {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {getLessonsForDay(selectedDate).length === 0 ? (
            <p className={`text-center py-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Nenhuma aula agendada para este dia
            </p>
          ) : (
            <div className="space-y-4">
              {getLessonsForDay(selectedDate)
                .sort((a, b) => {
                  const aTime = a.start_time || '23:59';
                  const bTime = b.start_time || '23:59';
                  return aTime.localeCompare(bTime);
                })
                .map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    onEdit={() => onLessonClick(lesson)}
                    onDelete={() => onDeleteLesson?.(lesson.id)}
                    onStatusChange={onStatusChange}
                    theme={theme}
                  />
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}