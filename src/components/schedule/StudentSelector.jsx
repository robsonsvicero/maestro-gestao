import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Music2 } from "lucide-react";

export default function StudentSelector({ students, selectedStudent, onSelectStudent, theme }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.instrument.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <Card className={`backdrop-blur-xl shadow-xl ${
      theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-white/60 border-slate-200'
    }`}>
      <CardHeader className={`border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
        <CardTitle className={`flex items-center gap-2 ${
          theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
        }`}>
          <Users className="w-5 h-5 text-[#094C7E]" />
          Selecione o Aluno
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
            theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
          }`} />
          <Input
            placeholder="Buscar aluno..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`pl-10 ${
              theme === 'dark' ? 'bg-slate-700 border-slate-600 text-slate-100' : ''
            }`}
          />
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredStudents.length === 0 ? (
            <p className={`text-center py-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Nenhum aluno encontrado
            </p>
          ) : (
            filteredStudents.map((student) => (
              <button
                key={student.id}
                onClick={() => onSelectStudent(student)}
                className={`w-full p-4 rounded-lg border transition-all ${
                  selectedStudent?.id === student.id
                    ? 'border-[#094C7E] bg-[#094C7E]/10'
                    : theme === 'dark'
                    ? 'border-slate-700 hover:bg-slate-700'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border-2 border-[#094C7E]">
                    <AvatarFallback className="bg-gradient-to-br from-[#094C7E] to-[#0A5A94] text-white font-bold text-sm">
                      {getInitials(student.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className={`font-semibold ${
                      theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                    }`}>
                      {student.full_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Music2 className="w-3 h-3 text-[#094C7E]" />
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        {student.instrument}
                      </span>
                      {student.lesson_day && (
                        <Badge variant="outline" className="text-xs">
                          {student.lesson_day}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}