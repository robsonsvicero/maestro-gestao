import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StudentForm({ student, onSubmit, onCancel, theme }) {
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
    level: "beginner",
    lesson_day: "",
    lesson_time: "",
    notes: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      birthday_day: formData.birthday_day ? parseInt(formData.birthday_day) : undefined,
      birthday_month: formData.birthday_month ? parseInt(formData.birthday_month) : undefined,
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
              <SelectItem value="beginner">Iniciante</SelectItem>
              <SelectItem value="intermediate">Intermediário</SelectItem>
              <SelectItem value="advanced">Avançado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lesson_day" className={labelClass}>Dia da Aula</Label>
          <Input
            id="lesson_day"
            value={formData.lesson_day || ''}
            onChange={(e) => setFormData({ ...formData, lesson_day: e.target.value })}
            placeholder="Ex: Terça-feira"
            className={inputClass}
          />
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
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94]">
          {student ? 'Atualizar' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}