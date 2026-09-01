import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getNextPaymentDate, getPaymentStatus } from "@/utils/paymentUtils";

export default function StudentForm({ student, onSubmit, onCancel, theme, isSubmitting = false }) {
  const [formData, setFormData] = useState(student || {
    full_name: "",
    birthday_day: "",
    birthday_month: "",
    address: "",
    email: "",
    phone: "",
    parent_name: "",
    parent_phone: "",
    instrument: "",
    level: "iniciante",
    lesson_day: "",
    lesson_time: "",
    monthly_payment: "",
    payment_day: "",
    payment_status: "pending",
    student_status: "active",
    last_payment_date: "",
    next_payment_date: "",
    notes: ""
  });

  const [calculatedPaymentStatus, setCalculatedPaymentStatus] = useState(formData.payment_status || 'pending');

  useEffect(() => {
    if (!formData.payment_day) {
      return;
    }

    const nextDate = getNextPaymentDate(
      formData.payment_day,
      formData.payment_status || 'pending',
      Array.isArray(formData.payment_history) ? formData.payment_history : [],
    );

    // Calculate automatic payment status
    const autoStatus = getPaymentStatus(
      nextDate,
      formData.last_payment_date,
    );

    setCalculatedPaymentStatus(autoStatus);

    setFormData((current) => {
      if (current.next_payment_date === nextDate) {
        return current;
      }

      return { ...current, next_payment_date: nextDate };
    });
  }, [formData.payment_day, formData.payment_status, formData.payment_history, formData.last_payment_date]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextPaymentDate = getNextPaymentDate(
      formData.payment_day,
      calculatedPaymentStatus || 'pending',
      Array.isArray(formData.payment_history) ? formData.payment_history : [],
    );

    onSubmit({
      ...formData,
      payment_status: calculatedPaymentStatus || 'pending',
      next_payment_date: nextPaymentDate || null,
      last_payment_date: formData.last_payment_date || null,
      birthday_day: formData.birthday_day ? parseInt(formData.birthday_day) : undefined,
      birthday_month: formData.birthday_month ? parseInt(formData.birthday_month) : undefined,
      monthly_payment: formData.monthly_payment ? Number(formData.monthly_payment) : 0,
      payment_day: formData.payment_day ? Number(formData.payment_day) : undefined,
    });
  };

  const labelClass = theme === 'dark' ? 'text-slate-200' : '';
  const inputClass = theme === 'dark' ? 'bg-slate-700 border-slate-600 text-slate-100' : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="full_name" className={labelClass}>Nome Completo *</Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Nome completo do aluno"
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className={labelClass}>Telefone *</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="(00) 00000-0000"
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className={labelClass}>Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@exemplo.com"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="parent_name" className={labelClass}>Nome do Responsável</Label>
          <Input
            id="parent_name"
            value={formData.parent_name || ''}
            onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
            placeholder="Nome do pai/mãe/responsável"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="parent_phone" className={labelClass}>Telefone do Responsável</Label>
          <Input
            id="parent_phone"
            value={formData.parent_phone || ''}
            onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
            placeholder="(00) 00000-0000"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instrument" className={labelClass}>Instrumento *</Label>
          <Input
            id="instrument"
            value={formData.instrument}
            onChange={(e) => setFormData({ ...formData, instrument: e.target.value })}
            placeholder="Ex: Violão, Piano, Bateria"
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="level" className={labelClass}>Nível</Label>
          <Select
            value={formData.level}
            onValueChange={(value) => setFormData({ ...formData, level: value })}
          >
            <SelectTrigger className={inputClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="iniciante">Iniciante</SelectItem>
              <SelectItem value="intermediário">Intermediário</SelectItem>
              <SelectItem value="avançado">Avançado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lesson_day" className={labelClass}>Dia da Aula</Label>
          <Select
            value={formData.lesson_day || ''}
            onValueChange={(value) => setFormData({ ...formData, lesson_day: value })}
          >
            <SelectTrigger id="lesson_day" className={inputClass}>
              <SelectValue placeholder="Selecione o dia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="segunda-feira">Segunda-feira</SelectItem>
              <SelectItem value="terça-feira">Terça-feira</SelectItem>
              <SelectItem value="quarta-feira">Quarta-feira</SelectItem>
              <SelectItem value="quinta-feira">Quinta-feira</SelectItem>
              <SelectItem value="sexta-feira">Sexta-feira</SelectItem>
              <SelectItem value="sábado">Sábado</SelectItem>
              <SelectItem value="domingo">Domingo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lesson_time" className={labelClass}>Horário da Aula</Label>
          <Input
            id="lesson_time"
            type="time"
            value={formData.lesson_time || ''}
            onChange={(e) => setFormData({ ...formData, lesson_time: e.target.value })}
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="birthday_day" className={labelClass}>Dia de Nascimento</Label>
          <Input
            id="birthday_day"
            type="number"
            min="1"
            max="31"
            value={formData.birthday_day || ''}
            onChange={(e) => setFormData({ ...formData, birthday_day: e.target.value })}
            placeholder="DD"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="birthday_month" className={labelClass}>Mês de Nascimento</Label>
          <Input
            id="birthday_month"
            type="number"
            min="1"
            max="12"
            value={formData.birthday_month || ''}
            onChange={(e) => setFormData({ ...formData, birthday_month: e.target.value })}
            placeholder="MM"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthly_payment" className={labelClass}>Mensalidade (R$)</Label>
          <Input
            id="monthly_payment"
            type="number"
            min="0"
            step="0.01"
            value={formData.monthly_payment || ''}
            onChange={(e) => setFormData({ ...formData, monthly_payment: e.target.value })}
            placeholder="0,00"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_day" className={labelClass}>Dia de vencimento</Label>
          <Input
            id="payment_day"
            type="number"
            min="1"
            max="31"
            value={formData.payment_day || ''}
            onChange={(e) => setFormData({ ...formData, payment_day: e.target.value })}
            placeholder="Ex: 5"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_status" className={labelClass}>Status do pagamento</Label>
          <Input
            id="payment_status"
            type="text"
            value={calculatedPaymentStatus === 'paid' ? 'Pago' : 'Pendente'}
            disabled
            readOnly
            className={`${inputClass} bg-slate-100 text-slate-600 cursor-not-allowed dark:bg-slate-800 dark:text-slate-300`}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="student_status" className={labelClass}>Status do aluno</Label>
          <Select
            value={formData.student_status || 'active'}
            onValueChange={(value) => setFormData({ ...formData, student_status: value })}
          >
            <SelectTrigger className={inputClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_payment_date" className={labelClass}>Último pagamento</Label>
          <Input
            id="last_payment_date"
            type="date"
            value={formData.last_payment_date || ''}
            onChange={(e) => setFormData({ ...formData, last_payment_date: e.target.value })}
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="next_payment_date" className={labelClass}>Próximo vencimento</Label>
          <Input
            id="next_payment_date"
            type="date"
            value={formData.next_payment_date || ''}
            readOnly
            className={`${inputClass} bg-slate-100 text-slate-600 cursor-not-allowed dark:bg-slate-800 dark:text-slate-300`}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address" className={labelClass}>Endereço</Label>
          <Input
            id="address"
            value={formData.address || ''}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Endereço completo"
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className={labelClass}>Observações</Label>
        <Textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Anotações sobre o aluno..."
          rows={3}
          className={inputClass}
        />
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94]"
          disabled={isSubmitting}
        >
          {isSubmitting ? (student ? 'Atualizando...' : 'Salvando...') : (student ? 'Atualizar' : 'Salvar')}
        </Button>
      </div>
    </form>
  );
}
