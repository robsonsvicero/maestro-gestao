import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import LessonCard from "./LessonCard";

export default function ListView({ lessons, onEdit, onDelete, onStatusChange, theme, isLoading }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = lesson.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lesson.instrument.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || lesson.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    // Sort by date and time
    const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return b.start_time.localeCompare(a.start_time);
  });

  if (isLoading) {
    return (
      <Card className={`p-12 backdrop-blur-xl shadow-xl ${
        theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-white/60 border-slate-200'
      }`}>
        <p className={`text-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
          Carregando aulas...
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className={`p-4 backdrop-blur-xl shadow-lg ${
        theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-white/60 border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`} />
            <Input
              placeholder="Buscar por aluno ou instrumento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 ${
                theme === 'dark' ? 'bg-slate-700 border-slate-600 text-slate-100' : ''
              }`}
            />
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
            <TabsList className={theme === 'dark' ? 'bg-slate-700' : ''}>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="scheduled">Agendadas</TabsTrigger>
              <TabsTrigger value="completed">Concluídas</TabsTrigger>
              <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {filteredLessons.length === 0 ? (
        <Card className={`p-12 backdrop-blur-xl shadow-xl ${
          theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-white/60 border-slate-200'
        }`}>
          <p className={`text-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Nenhuma aula encontrada
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredLessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              onEdit={() => onEdit(lesson)}
              onDelete={() => onDelete(lesson.id)}
              onStatusChange={onStatusChange}
              theme={theme}
              showDate={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}