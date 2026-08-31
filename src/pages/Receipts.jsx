import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

import ReceiptForm from "../components/receipts/ReceiptForm";
import ReceiptList from "../components/receipts/ReceiptList";
import ReceiptPreview from "../components/receipts/ReceiptPreview";

const sanitizeReceiptPayload = (data = {}) => ({
  receipt_number: data.receipt_number,
  student_id: data.student_id || null,
  student_name: data.student_name,
  amount: Number(data.amount),
  description: data.description,
  payment_date: data.payment_date,
  payment_method: data.payment_method,
  status: 'paid',
});

export default function Receipts() {
  const [showForm, setShowForm] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => base44.entities.Receipt.list('-created_date'),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const settings = appSettings[0] || {};

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const payload = sanitizeReceiptPayload(data);
      const receipt = await base44.entities.Receipt.create(payload);

      if (!receipt) {
        throw new Error('Não foi possível criar o recibo. Verifique autenticação e políticas do Supabase.');
      }

      await base44.entities.Transaction.create({
        type: "income",
        category: "lesson_payment",
        amount: payload.amount,
        description: payload.description,
        date: payload.payment_date,
        payment_method: payload.payment_method,
        student_name: payload.student_name
      });

      return receipt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['receipts']);
      queryClient.invalidateQueries(['transactions']);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Receipt.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['receipts']);
    },
  });

  const handleSubmit = (data) => {
    createMutation.mutate(data);
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir este recibo?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredReceipts = receipts.filter(receipt =>
    receipt.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    receipt.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (previewReceipt) {
    return (
      <ReceiptPreview
        receipt={previewReceipt}
        companySettings={settings}
        onClose={() => setPreviewReceipt(null)}
      />
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-slate-900 dark:text-slate-100">
            Recibos
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gere recibos de pagamento para seus alunos
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94] hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Recibo
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 shadow-xl bg-white dark:bg-slate-800">
          <ReceiptForm
            students={students}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
          />
        </Card>
      )}

      <Card className="p-4 shadow-lg bg-white dark:bg-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Buscar por aluno ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
          />
        </div>
      </Card>

      <ReceiptList
        receipts={filteredReceipts}
        isLoading={isLoading}
        onPreview={setPreviewReceipt}
        onDelete={handleDelete}
      />
    </div>
  );
}