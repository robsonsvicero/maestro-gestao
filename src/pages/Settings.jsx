import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, CalendarCheck, Upload, Image, Lock } from "lucide-react";

export default function Settings() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: settings = [], isLoading: _isLoading } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const [formData, setFormData] = useState({
    school_name: "",
    logo_url: "",
    google_calendar_email: "",
    sync_with_google_calendar: false,
    teacher_phone: "",
    cpf_cnpj: "",
    default_lesson_duration: 60,
  });

  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirmPassword: "",
  });

  const [passwordFeedback, setPasswordFeedback] = useState({
    type: "",
    message: "",
  });

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        await base44.auth.me();
      } catch {
        console.error("Error loading user:");
      }
    };

    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (settings.length > 0) {
      setFormData({
        school_name: settings[0].school_name || "",
        logo_url: settings[0].logo_url || "",
        google_calendar_email: settings[0].google_calendar_email || "",
        sync_with_google_calendar: settings[0].sync_with_google_calendar || false,
        teacher_phone: settings[0].teacher_phone || "",
        cpf_cnpj: settings[0].cpf_cnpj || "",
        default_lesson_duration: settings[0].default_lesson_duration || 60,
      });
    }
  }, [settings]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, logo_url: file_url });
      // Limpar o input file
      e.target.value = "";
      alert("Logo enviado com sucesso! Clique em 'Salvar Configurações' para confirmar.");
    } catch (error) {
      const errorMessage = error?.message || "Erro ao fazer upload do logo";
      alert(errorMessage);
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const [saveFeedback, setSaveFeedback] = useState({
    type: "",
    message: "",
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const { data: existingRows, error: rowsError } = await supabase
        .from('app_settings')
        .select('id')
        .limit(10);

      if (rowsError) throw rowsError;

      const targetRow = settings[0] ?? existingRows?.[0];

      if (targetRow?.id) {
        return base44.entities.AppSettings.update(targetRow.id, data);
      }

      return base44.entities.AppSettings.create(data);
    },
    onSuccess: () => {
      setSaveFeedback({ type: "success", message: "Configurações salvas com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      setTimeout(() => setSaveFeedback({ type: "", message: "" }), 3000);
    },
    onError: (error) => {
      setSaveFeedback({ type: "error", message: error.message || "Erro ao salvar configurações" });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    if (!passwordForm.password || !passwordForm.confirmPassword) {
      setPasswordFeedback({ type: "error", message: "Preencha os dois campos de senha." });
      return;
    }

    if (passwordForm.password.length < 6) {
      setPasswordFeedback({ type: "error", message: "A nova senha deve ter pelo menos 6 caracteres." });
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordFeedback({ type: "error", message: "As senhas não coincidem." });
      return;
    }

    try {
      const { data, error } = await supabase.auth.updateUser({ password: passwordForm.password });

      if (error || !data?.user) {
        throw error || new Error('O Supabase não confirmou a alteração da senha.');
      }

      setPasswordForm({ password: "", confirmPassword: "" });
      setPasswordFeedback({
        type: "success",
        message: "Tudo certo! Sua senha foi atualizada com sucesso.",
      });
    } catch (error) {
      const message = error?.message || "Não foi possível alterar a senha.";
      setPasswordFeedback({ type: "error", message });
    }
  };

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

      <div className="space-y-6">
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
              <Label htmlFor="cpf_cnpj">
                CPF ou CNPJ
              </Label>
              <Input
                id="cpf_cnpj"
                value={formData.cpf_cnpj}
                onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                placeholder="Digite o CPF ou CNPJ"
              />
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
                    accept=".jpg,.jpeg,.png,.gif,.webp,.svg"
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

        <Card className="shadow-xl">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#094C7E]" />
              Segurança da conta
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">Nova senha</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                  placeholder="Digite a nova senha"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirmar nova senha</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Confirme a nova senha"
                />
              </div>

              {passwordFeedback.message && (
                <div
                  className={
                    passwordFeedback.type === 'success'
                      ? 'rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700'
                      : 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
                  }
                >
                  {passwordFeedback.message}
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" variant="outline" className="border-[#094C7E] text-[#094C7E] hover:bg-[#094C7E] hover:text-white">
                  Alterar senha
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {saveFeedback.message && (
          <div
            className={
              saveFeedback.type === 'success'
                ? 'rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700'
                : 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
            }
          >
            {saveFeedback.message}
          </div>
        )}

        <div className="flex justify-end">
          <Button 
            type="button"
            onClick={handleSubmit}
            className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94]"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </div>
    </div>
  );
}
