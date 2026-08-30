import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ReceiptForm({ students, onSubmit, onCancel, theme }) {
  const [formData, setFormData] = useState({
    receipt_number: `REC-${Date.now()}`,
    student_id: "",
    student_name: "",
    student_email: "",
    issue_date: new Date().toISOString().split('T')[0],
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: "pix",
    description: "",
    amount: "",
    notes: ""
  });

  const handleStudentChange = (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      setFormData({
        ...formData,
        student_id: studentId,
        student_name: student.full_name,
        student_email: student.email || ""
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount)
    });
  };

  const labelClass = theme === 'dark' ? 'text-slate-200' : '';
  const inputClass = theme === 'dark' ? 'bg-slate-700 border-slate-600 text-slate-100' : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="student" className={labelClass}>Aluno *</Label>
          <Select
            value={formData.student_id}
            onValueChange={handleStudentChange}
            required
          >
            <SelectTrigger className={inputClass}>
              <SelectValue placeholder="Selecione um aluno" />
            </SelectTrigger>
            <SelectContent>
              {students.map(student => (
                <SelectItem key={student.id} value={student.id}>
                  {student.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="receipt_number" className={labelClass}>Número do Recibo</Label>
          <Input
            id="receipt_number"
            value={formData.receipt_number}
            onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount" className={labelClass}>Valor (R$) *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0,00"
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_date" className={labelClass}>Data do Pagamento *</Label>
          <Input
            id="payment_date"
            type="date"
            value={formData.payment_date}
            onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_method" className={labelClass}>Forma de Pagamento *</Label>
          <Select
            value={formData.payment_method}
            onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
          >
            <SelectTrigger className={inputClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Dinheiro</SelectItem>
              <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
              <SelectItem value="debit_card">Cartão de Débito</SelectItem>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className={labelClass}>Descrição do Serviço *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Ex: Pagamento de 4 aulas de violão..."
          rows={3}
          required
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className={labelClass}>Observações</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Observações adicionais..."
          rows={2}
          className={inputClass}
        />
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94]">
          Gerar Recibo
        </Button>
      </div>
    </form>
  );
}