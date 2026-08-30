import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Plus, Trash2, Save } from "lucide-react";

const dayLabels = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo"
};

const emptyHours = {
  monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
};

export default function MyHours() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    school_name: "",
    default_lesson_duration: 60,
    available_hours: emptyHours
  });
  const [existingId, setExistingId] = useState(null);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  useEffect(() => {
    if (settings.length > 0) {
      const s = settings[0];
      setExistingId(s.id);
      setFormData({
        school_name: s.school_name || "",
        default_lesson_duration: s.default_lesson_duration || 60,
        available_hours: s.available_hours || emptyHours
      });
    } else {
      setExistingId(null);
      setFormData({ school_name: "", default_lesson_duration: 60, available_hours: emptyHours });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingId) {
        return base44.entities.AppSettings.update(existingId, data);
      } else {
        return base44.entities.AppSettings.create({
          ...data,
          school_name: data.school_name || "Meu Horário"
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['appSettings']);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const addTimeSlot = (day) => {
    setFormData({
      ...formData,
      available_hours: {
        ...formData.available_hours,
        [day]: [...(formData.available_hours[day] || []), { start: "09:00", end: "10:00" }]
      }
    });
  };

  const removeTimeSlot = (day, index) => {
    const newSlots = [...formData.available_hours[day]];
    newSlots.splice(index, 1);
    setFormData({
      ...formData,
      available_hours: { ...formData.available_hours, [day]: newSlots }
    });
  };

  const updateTimeSlot = (day, index, field, value) => {
    const newSlots = [...formData.available_hours[day]];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setFormData({
      ...formData,
      available_hours: { ...formData.available_hours, [day]: newSlots }
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#094C7E] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-slate-900 dark:text-slate-100">
          Meus Horários
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Defina seus horários de atendimento disponíveis para agendamento
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="shadow-xl bg-white dark:bg-slate-800">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Clock className="w-5 h-5 text-[#094C7E]" />
              Duração Padrão das Aulas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="default_lesson_duration" className="text-slate-700 dark:text-slate-300">
                Duração (minutos)
              </Label>
              <Input
                id="default_lesson_duration"
                type="number"
                value={formData.default_lesson_duration}
                onChange={(e) => setFormData({ ...formData, default_lesson_duration: parseInt(e.target.value) || 60 })}
                className="bg-white dark:bg-slate-700"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl bg-white dark:bg-slate-800">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Clock className="w-5 h-5 text-[#094C7E]" />
              Horários Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {Object.entries(dayLabels).map(([day, label]) => (
              <div key={day} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-700 dark:text-slate-300">{label}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addTimeSlot(day)}
                    className="border-[#094C7E]/30 text-[#094C7E] hover:bg-[#094C7E]/5"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Horário
                  </Button>
                </div>
                <div className="space-y-2">
                  {(formData.available_hours[day] || []).map((slot, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={slot.start}
                        onChange={(e) => updateTimeSlot(day, index, 'start', e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-700"
                      />
                      <span className="text-slate-600 dark:text-slate-400">até</span>
                      <Input
                        type="time"
                        value={slot.end}
                        onChange={(e) => updateTimeSlot(day, index, 'end', e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-700"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTimeSlot(day, index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {(formData.available_hours[day] || []).length === 0 && (
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      Nenhum horário configurado
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94]"
            disabled={saveMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar Horários'}
          </Button>
        </div>
      </form>
    </div>
  );
}