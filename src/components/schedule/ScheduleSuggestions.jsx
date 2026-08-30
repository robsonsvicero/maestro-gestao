import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ScheduleSuggestions({ slots, selectedSlot, onSelectSlot, theme }) {
  const [currentPage, setCurrentPage] = useState(0);
  const slotsPerPage = 12;

  const totalPages = Math.ceil(slots.length / slotsPerPage);
  const currentSlots = slots.slice(
    currentPage * slotsPerPage,
    (currentPage + 1) * slotsPerPage
  );

  const groupedSlots = currentSlots.reduce((acc, slot) => {
    const dateKey = format(slot.date, 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(slot);
    return acc;
  }, {});

  const handlePreviousPage = () => {
    setCurrentPage(Math.max(0, currentPage - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(Math.min(totalPages - 1, currentPage + 1));
  };

  const isSelected = (slot) => {
    if (!selectedSlot) return false;
    return isSameDay(slot.date, selectedSlot.date) &&
           slot.start_time === selectedSlot.start_time;
  };

  return (
    <Card className={`backdrop-blur-xl shadow-xl ${
      theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-white/60 border-slate-200'
    }`}>
      <CardHeader className={`border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${
            theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
          }`}>
            <Calendar className="w-5 h-5 text-[#094C7E]" />
            Horários Disponíveis ({slots.length})
          </CardTitle>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                {currentPage + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {slots.length === 0 ? (
          <p className={`text-center py-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Nenhum horário disponível encontrado para as próximas 4 semanas.
          </p>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSlots).map(([dateKey, daySlots]) => (
              <div key={dateKey}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-[#094C7E]" />
                  <h3 className={`font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                    {format(daySlots[0].date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {daySlots.map((slot, index) => (
                    <Button
                      key={index}
                      variant={isSelected(slot) ? "default" : "outline"}
                      className={`flex items-center gap-2 ${
                        isSelected(slot)
                          ? 'bg-gradient-to-r from-[#094C7E] to-[#0A5A94] text-white'
                          : ''
                      }`}
                      onClick={() => onSelectSlot(slot)}
                    >
                      <Clock className="w-3 h-3" />
                      {slot.start_time}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}