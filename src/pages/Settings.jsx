import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Mail, Shield, Clock, Plus, Trash2, CalendarCheck, Upload, Image } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Settings() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const [formData, setFormData] = useState({
    school_name: "",
    logo_url: "",
    google_calendar_email: "",
    sync_with_google_calendar: false,
    admin_email: "",
    teacher_phone: "",
    default_lesson_duration: 60,
    available_hours: {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    }
  });

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (settings.length > 0) {
      setFormData({
        school_name: settings[0].school_name || "",
        logo_url: settings[0].logo_url || "",
        google_calendar_email: settings[0].google_calendar_email || "",
        sync_with_google_calendar: settings[0].sync_with_google_calendar || false,
        admin_email: settings[0].admin_email || "",
        teacher_phone: settings[0].teacher_phone || "",
        default_lesson_duration: settings[0].default_lesson_duration || 60,
        available_hours: settings[0].available_hours || {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: []
        }
      });
    }
  }, [settings]);

  const loadCurrentUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, logo_url: file_url });
    } catch (error) {
      alert("Erro ao fazer upload do logo");
    } finally {
      setUploading(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      if (settings.length > 0) {
        return base44.entities.AppSettings.update(settings[0].id, data);
      } else {
        return base44.entities.AppSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['appSettings']);
      window.location.reload();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const addTimeSlot = (day) => {
    setFormData({
      ...formData,
      available_hours: {
        ...formData.available_hours,
        [day]: [...formData.available_hours[day], { start: "09:00", end: "10:00" }]
      }
    });
  };

  const removeTimeSlot = (day, index) => {
    const newSlots = [...formData.available_hours[day]];
    newSlots.splice(index, 1);
    setFormData({
      ...formData,
      available_hours: {
        ...formData.available_hours,
        [day]: newSlots
      }
    });
  };

  const updateTimeSlot = (day, index, field, value) => {
    const newSlots = [...formData.available_hours[day]];
    newSlots[index][field] = value;
    setFormData({
      ...formData,
      available_hours: {
        ...formData.available_hours,
        [day]: newSlots
      }
    });
  };

  const dayLabels = {
    monday: "Segunda-feira",
    tuesday: "Terça-feira",
    wednesday: "Quarta-feira",
    thursday: "Quinta-feira",
    friday: "Sexta-feira",
    saturday: "Sábado",
    sunday: "Domingo"
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-4 md:p-8">
        <Card className="p-12 shadow-xl">
          <p className="text-center text-slate-500">
            Acesso negado. Apenas administradores podem acessar as configurações.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Configurações
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Gerencie as configurações do aplicativo
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Gerais */}
        <Card className="shadow-xl">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-[#094C7E]" />
              Informações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="school_name">
                  Nome da Escola/Professor
                </Label>
                <Input
                  id="school_name"
                  value={formData.school_name}
                  onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                  placeholder="Ex: Escola de Música Harmonia"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacher_phone">
                  Telefone do Professor
                </Label>
                <Input
                  id="teacher_phone"
                  value={formData.teacher_phone}
                  onChange={(e) => setFormData({ ...formData, teacher_phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Logo da Escola/Professor</Label>
              <div className="flex items-center gap-4">
                {formData.logo_url ? (
                  <img src={formData.logo_url} alt="Logo" className="w-20 h-20 object-contain rounded-lg border" />
                ) : (
                  <div className="w-20 h-20 rounded-lg border bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Image className="w-8 h-8 text-slate-400" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label htmlFor="logo-upload">
                    <Button type="button" variant="outline" disabled={uploading} asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? 'Enviando...' : 'Fazer Upload'}
                      </span>
                    </Button>
                  </label>
                  {formData.logo_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="ml-2 text-red-600"
                      onClick={() => setFormData({ ...formData, logo_url: "" })}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-500">
                Faça upload do logo. Se não tiver, o ícone padrão será exibido.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_lesson_duration">
                Duração Padrão das Aulas (minutos)
              </Label>
              <Input
                id="default_lesson_duration"
                type="number"
                value={formData.default_lesson_duration}
                onChange={(e) => setFormData({ ...formData, default_lesson_duration: parseInt(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Google Calendar */}
        <Card className="shadow-xl">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-[#094C7E]" />
              Integração com Google Calendar
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="space-y-1">
                <Label>
                  Sincronizar com Google Calendar
                </Label>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Aulas agendadas serão automaticamente adicionadas ao Google Calendar
                </p>
              </div>
              <Switch
                checked={formData.sync_with_google_calendar}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, sync_with_google_calendar: checked })
                }
              />
            </div>
            
            {formData.sync_with_google_calendar && (
              <div className="space-y-2">
                <Label htmlFor="google_calendar_email">
                  Email do Google Calendar *
                </Label>
                <Input
                  id="google_calendar_email"
                  type="email"
                  value={formData.google_calendar_email}
                  onChange={(e) => setFormData({ ...formData, google_calendar_email: e.target.value })}
                  placeholder="seuemail@gmail.com"
                  required={formData.sync_with_google_calendar}
                />
                <p className="text-sm text-slate-500">
                  Este email será usado para criar eventos no Google Calendar do professor.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Horários Disponíveis */}
        <Card className="shadow-xl">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#094C7E]" />
              Horários Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {Object.entries(dayLabels).map(([day, label]) => (
              <div key={day} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{label}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addTimeSlot(day)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Horário
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.available_hours[day].map((slot, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={slot.start}
                        onChange={(e) => updateTimeSlot(day, index, 'start', e.target.value)}
                        className="flex-1"
                      />
                      <span className="text-slate-600 dark:text-slate-400">até</span>
                      <Input
                        type="time"
                        value={slot.end}
                        onChange={(e) => updateTimeSlot(day, index, 'end', e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTimeSlot(day, index)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {formData.available_hours[day].length === 0 && (
                    <p className="text-sm text-slate-400">
                      Nenhum horário configurado
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Administrador */}
        <Card className="shadow-xl">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#094C7E]" />
              Administrador
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin_email">
                Email do Administrador
              </Label>
              <Select
                value={formData.admin_email}
                onValueChange={(value) => setFormData({ ...formData, admin_email: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.email}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-slate-500">
                Selecione qual usuário será o administrador do aplicativo.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button 
            type="submit" 
            className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94]"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </form>
    </div>
  );
}