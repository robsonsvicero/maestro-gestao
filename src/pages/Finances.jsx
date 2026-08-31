import { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, PencilLine, Trash2 } from "lucide-react";

const fallbackTransactions = [];

const getTodayDate = () => new Date().toISOString().split('T')[0];

const emptyTransaction = {
  type: 'expense',
  category: 'general',
  description: '',
  amount: '',
  date: getTodayDate(),
  payment_method: 'pix',
  student_name: '',
};

export default function Finances() {
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [formData, setFormData] = useState(emptyTransaction);
  const [filters] = useState({ type: 'all', category: 'all', period: 'all' });
  const queryClient = useQueryClient();

  const { data: transactions = fallbackTransactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('transaction').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { data: transaction, error } = await supabase.from('transaction').insert(data).select().single();
      if (error) throw error;
      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowForm(false);
      setEditingTransaction(null);
      setFormData(emptyTransaction);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: transaction, error } = await supabase.from('transaction').update(data).eq('id', id).select().single();
      if (error) throw error;
      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowForm(false);
      setEditingTransaction(null);
      setFormData(emptyTransaction);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('transaction').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const openNewTransactionForm = () => {
    setEditingTransaction(null);
    setFormData({ ...emptyTransaction, date: getTodayDate() });
    setShowForm(true);
  };

  const openEditTransactionForm = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      ...transaction,
      amount: Number(transaction.amount || 0),
      date: transaction.date ? transaction.date.slice(0, 10) : getTodayDate(),
    });
    setShowForm(true);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const payload = {
      ...formData,
      amount: Number(formData.amount || 0),
      description: formData.description?.trim() || 'Transação sem descrição',
      student_name: formData.student_name?.trim() || null,
    };

    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, data: payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filters.type !== 'all' && transaction.type !== filters.type) return false;
    if (filters.category !== 'all' && transaction.category !== filters.category) return false;

    if (filters.period !== 'all') {
      const transactionDate = new Date(transaction.date);
      const now = new Date();

      if (filters.period === 'today') {
        return transactionDate.toDateString() === now.toDateString();
      } else if (filters.period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return transactionDate >= weekAgo;
      } else if (filters.period === 'month') {
        return transactionDate.getMonth() === now.getMonth() && transactionDate.getFullYear() === now.getFullYear();
      } else if (filters.period === 'year') {
        return transactionDate.getFullYear() === now.getFullYear();
      }
    }

    return true;
  });

  const totals = filteredTransactions.reduce((acc, t) => {
    if (t.type === 'income') acc.income += Number(t.amount || 0);
    else acc.expenses += Number(t.amount || 0);
    return acc;
  }, { income: 0, expenses: 0 });

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">Finanças</h1>
          <p className="text-slate-600 dark:text-slate-400">Gerencie suas receitas e despesas</p>
        </div>
        <Button onClick={openNewTransactionForm} className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94] hover:shadow-lg transition-all">
          <Plus className="w-4 h-4 mr-2" />
          Nova Transação
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-0 shadow-lg">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Total de Receitas</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">R$ {totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-0 shadow-lg">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Total de Despesas</p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">R$ {totals.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-0 shadow-lg">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Saldo</p>
          <p className={`text-3xl font-bold ${totals.income - totals.expenses >= 0 ? 'text-[#094C7E]' : 'text-red-600 dark:text-red-400'}`}>
            R$ {(totals.income - totals.expenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>
      </div>

      {showForm && (
        <Card className="p-6 bg-white dark:bg-slate-800 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {editingTransaction ? 'Editar transação' : 'Nova transação'}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Receita</SelectItem>
                    <SelectItem value="expense">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Geral</SelectItem>
                    <SelectItem value="monthly_payment">Mensalidade</SelectItem>
                    <SelectItem value="lesson">Aula</SelectItem>
                    <SelectItem value="supplies">Materiais</SelectItem>
                    <SelectItem value="rent">Aluguel</SelectItem>
                    <SelectItem value="salary">Salário</SelectItem>
                    <SelectItem value="taxes">Impostos</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(event) => setFormData({ ...formData, amount: event.target.value })}
                  placeholder="0,00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date || getTodayDate()}
                  onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Forma de pagamento</Label>
                <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                    <SelectItem value="bank_transfer">Transferência</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="student_name">Aluno / Origem</Label>
                <Input
                  id="student_name"
                  value={formData.student_name || ''}
                  onChange={(event) => setFormData({ ...formData, student_name: event.target.value })}
                  placeholder="Opcional"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  placeholder="Ex: Mensalidade de agosto, compra de material, pagamento de aluguel"
                  rows={3}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => {
                setShowForm(false);
                setEditingTransaction(null);
                setFormData(emptyTransaction);
              }}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94]" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : editingTransaction ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="rounded-lg border bg-white p-4 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Lista de transações ({filteredTransactions.length})</p>
        </div>
        {isLoading ? (
          <p className="mt-3 text-slate-500">Carregando...</p>
        ) : filteredTransactions.length === 0 ? (
          <p className="mt-3 text-slate-500">Nenhuma transação registrada.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {filteredTransactions.map((t) => (
              <li key={t.id} className="flex flex-col gap-3 rounded border border-slate-200 p-3 text-sm dark:border-slate-700 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? 'Receita' : 'Despesa'}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 dark:text-slate-300">{t.category}</span>
                  </div>
                  <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">{t.description}</p>
                  {t.student_name && <p className="text-xs text-slate-500">{t.student_name}</p>}
                </div>

                <div className="flex items-center gap-3">
                  <span className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}R$ {Number(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={() => openEditTransactionForm(t)} className="h-8 w-8">
                      <PencilLine className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        if (window.confirm('Deseja excluir esta transação?')) {
                          deleteMutation.mutate(t.id);
                        }
                      }}
                      className="h-8 w-8 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
