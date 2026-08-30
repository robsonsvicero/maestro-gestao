import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const fallbackTransactions = [];

export default function Finances() {
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filters, setFilters] = useState({ type: 'all', category: 'all', period: 'all' });
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

  const handleSubmit = (data) => {
    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      deleteMutation.mutate(id);
    }
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
        <Button onClick={() => { setEditingTransaction(null); setShowForm(!showForm); }} className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94] hover:shadow-lg transition-all">
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
          <div className="rounded border border-dashed border-slate-300 p-4 text-slate-500">
            Formulário de transação em desenvolvimento. O backend Supabase já está pronto para receber dados.
          </div>
        </Card>
      )}

      <div className="rounded-lg border bg-white p-4 dark:bg-slate-800">
        <p className="text-sm text-slate-500">Lista de transações ({filteredTransactions.length})</p>
        {isLoading ? <p className="mt-3 text-slate-500">Carregando...</p> : filteredTransactions.length === 0 ? <p className="mt-3 text-slate-500">Nenhuma transação registrada.</p> : <ul className="mt-4 space-y-2">{filteredTransactions.map((t) => <li key={t.id} className="flex justify-between rounded border p-3 text-sm"><span>{t.description}</span><span>{t.type === 'income' ? '+' : '-'}R$ {Number(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></li>)}</ul>}
      </div>
    </div>
  );
}
