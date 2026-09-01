import { useMemo, useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { jsPDF } from "jspdf";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, ArrowUpDown, FileDown, Plus, Search, PencilLine, Trash2 } from "lucide-react";
import { getLocalDateString, parseLocalDate } from "@/utils/dateUtils";

const fallbackTransactions = [];

const getTodayDate = () => getLocalDateString();

const paymentMethodLabels = {
  pix: 'PIX',
  cash: 'Dinheiro',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  bank_transfer: 'Transferência',
  other: 'Outro',
};

const formatCurrency = (value) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatDate = (value) => value ? parseLocalDate(value).toLocaleDateString('pt-BR') : '—';

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
  const [selectedMonth, setSelectedMonth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
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

  const filteredTransactions = useMemo(() => transactions.filter((transaction) => {
    const transactionDate = transaction.date?.slice(0, 10) || '';
    if (startDate && transactionDate < startDate) return false;
    if (endDate && transactionDate > endDate) return false;

    const searchableContent = [
      transaction.type === 'income' ? 'receita' : 'despesa',
      transaction.category,
      transaction.student_name,
      transaction.description,
      paymentMethodLabels[transaction.payment_method] || transaction.payment_method,
    ].filter(Boolean).join(' ').toLowerCase();

    return searchableContent.includes(searchTerm.trim().toLowerCase());
  }), [transactions, startDate, endDate, searchTerm]);

  const sortedTransactions = useMemo(() => [...filteredTransactions].sort((first, second) => {
    const values = {
      date: [(first.date || ''), (second.date || '')],
      entry: [
        `${first.type === 'income' ? 'Receita' : 'Despesa'} ${first.student_name || ''}`,
        `${second.type === 'income' ? 'Receita' : 'Despesa'} ${second.student_name || ''}`,
      ],
      description: [first.description || '', second.description || ''],
      payment_method: [paymentMethodLabels[first.payment_method] || '', paymentMethodLabels[second.payment_method] || ''],
      amount: [Number(first.amount || 0), Number(second.amount || 0)],
    };
    const [firstValue, secondValue] = values[sortConfig.key];
    const comparison = typeof firstValue === 'number'
      ? firstValue - secondValue
      : String(firstValue).localeCompare(String(secondValue), 'pt-BR');
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  }), [filteredTransactions, sortConfig]);

  const requestSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    if (!month) {
      setStartDate('');
      setEndDate('');
      return;
    }

    const [year, monthNumber] = month.split('-').map(Number);
    setStartDate(`${month}-01`);
    setEndDate(getLocalDateString(new Date(year, monthNumber, 0)));
  };

  const exportStatementToPdf = () => {
    const document = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = document.internal.pageSize.getWidth();
    const pageHeight = document.internal.pageSize.getHeight();
    const margin = 12;
    const columns = [
      { title: 'Data pagamento', width: 31 },
      { title: 'Lançamento + origem', width: 57 },
      { title: 'Descrição', width: 90 },
      { title: 'Forma de pagamento', width: 45 },
      { title: 'Valor', width: 35 },
    ];
    const filtersLabel = [
      startDate ? `De ${formatDate(startDate)}` : '',
      endDate ? `até ${formatDate(endDate)}` : '',
      searchTerm ? `Busca: ${searchTerm}` : '',
    ].filter(Boolean).join(' · ') || 'Todos os lançamentos';
    let y = 14;

    const drawHeader = (isFirstPage = false) => {
      if (isFirstPage) {
        document.setFont('helvetica', 'bold');
        document.setFontSize(16);
        document.text('Extrato financeiro', margin, y);
        y += 7;
        document.setFont('helvetica', 'normal');
        document.setFontSize(9);
        document.text(filtersLabel, margin, y);
        y += 8;
      }
      document.setFillColor(9, 76, 126);
      document.rect(margin, y, pageWidth - margin * 2, 7, 'F');
      document.setTextColor(255, 255, 255);
      document.setFont('helvetica', 'bold');
      document.setFontSize(8);
      let x = margin + 2;
      columns.forEach((column) => {
        document.text(column.title, x, y + 4.6);
        x += column.width;
      });
      document.setTextColor(20, 30, 45);
      document.setFont('helvetica', 'normal');
      y += 7;
    };

    drawHeader(true);
    sortedTransactions.forEach((transaction, index) => {
      const rowValues = [
        formatDate(transaction.date),
        `${transaction.type === 'income' ? 'Receita' : 'Despesa'}${transaction.student_name ? ` - ${transaction.student_name}` : ''}`,
        transaction.description || '—',
        paymentMethodLabels[transaction.payment_method] || transaction.payment_method || '—',
        `${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}`,
      ];
      const lines = rowValues.map((value, columnIndex) => document.splitTextToSize(value, columns[columnIndex].width - 4));
      const rowHeight = Math.max(7, ...lines.map((line) => line.length * 4.2 + 3));

      if (y + rowHeight > pageHeight - 18) {
        document.addPage();
        y = 14;
        drawHeader();
      }

      if (index % 2 === 1) {
        document.setFillColor(245, 248, 250);
        document.rect(margin, y, pageWidth - margin * 2, rowHeight, 'F');
      }
      let x = margin + 2;
      document.setFontSize(8);
      lines.forEach((line, columnIndex) => {
        document.text(line, x, y + 4.3);
        x += columns[columnIndex].width;
      });
      y += rowHeight;
    });

    if (y + 14 > pageHeight - 8) {
      document.addPage();
      y = 14;
    }
    document.setDrawColor(203, 213, 225);
    document.line(margin, y + 2, pageWidth - margin, y + 2);
    document.setFont('helvetica', 'bold');
    document.setFontSize(9);
    document.text(`Receitas: ${formatCurrency(totals.income)}`, margin, y + 8);
    document.text(`Despesas: ${formatCurrency(totals.expenses)}`, margin + 65, y + 8);
    document.text(`Saldo: ${formatCurrency(totals.income - totals.expenses)}`, margin + 130, y + 8);
    document.save(`extrato-financeiro-${getLocalDateString()}.pdf`);
  };

  const totals = filteredTransactions.reduce((acc, t) => {
    if (t.type === 'income') acc.income += Number(t.amount || 0);
    else acc.expenses += Number(t.amount || 0);
    return acc;
  }, { income: 0, expenses: 0 });

  return (
    <div className="w-full max-w-none space-y-6 p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">Finanças</h1>
          <p className="text-slate-600 dark:text-slate-400">Gerencie suas receitas e despesas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportStatementToPdf} disabled={filteredTransactions.length === 0}>
            <FileDown className="w-4 h-4 mr-2" />
            Salvar extrato em PDF
          </Button>
          <Button onClick={openNewTransactionForm} className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94] hover:shadow-lg transition-all">
          <Plus className="w-4 h-4 mr-2" />
          Nova Transação
          </Button>
        </div>
      </div>

      <div className="grid w-full gap-4 md:grid-cols-3">
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

      <Card className="w-full p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="finance-month">Mês</Label>
            <Input id="finance-month" type="month" value={selectedMonth} onChange={(event) => handleMonthChange(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="finance-start-date">Data inicial</Label>
            <Input id="finance-start-date" type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setSelectedMonth(''); }} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="finance-end-date">Data final</Label>
            <Input id="finance-end-date" type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setSelectedMonth(''); }} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="finance-search">Pesquisar lançamento</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input id="finance-search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Descrição, origem ou forma..." className="pl-9" />
            </div>
          </div>
        </div>
      </Card>

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

      <div className="w-full min-w-0 rounded-lg border bg-white p-4 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Lista de transações ({filteredTransactions.length})</p>
        </div>
        {isLoading ? (
          <p className="mt-3 text-slate-500">Carregando...</p>
        ) : filteredTransactions.length === 0 ? (
          <p className="mt-3 text-slate-500">Nenhuma transação registrada.</p>
        ) : (
          <>
            <div className="-mx-4 overflow-x-scroll px-4 pb-3 overscroll-x-contain">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-y bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                  <tr>
                    {[
                      ['date', 'Data pagamento'],
                      ['entry', 'Lançamento + origem'],
                      ['description', 'Descrição'],
                      ['payment_method', 'Forma de pagamento'],
                      ['amount', 'Valor'],
                    ].map(([key, label]) => (
                      <th key={key} className="px-3 py-3 font-semibold">
                        <button type="button" onClick={() => requestSort(key)} className="flex items-center gap-1 hover:text-[#094C7E]">
                          {label}
                          {sortConfig.key !== key ? <ArrowUpDown className="h-3.5 w-3.5" /> : sortConfig.direction === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                        </button>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/30">
                      <td className="whitespace-nowrap px-3 py-3">{formatDate(transaction.date)}</td>
                      <td className="px-3 py-3">
                        <p className={`font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{transaction.type === 'income' ? 'Receita' : 'Despesa'}</p>
                        <p className="text-xs text-slate-500">{transaction.student_name || transaction.category || 'Sem origem'}</p>
                      </td>
                      <td className="max-w-xs px-3 py-3 text-slate-700 dark:text-slate-200">{transaction.description || '—'}</td>
                      <td className="px-3 py-3">{paymentMethodLabels[transaction.payment_method] || transaction.payment_method || '—'}</td>
                      <td className={`whitespace-nowrap px-3 py-3 text-right font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="outline" onClick={() => openEditTransactionForm(transaction)} className="h-8 w-8"><PencilLine className="h-4 w-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => { if (window.confirm('Deseja excluir esta transação?')) deleteMutation.mutate(transaction.id); }} className="h-8 w-8 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {false && (<ul className="mt-4 space-y-3">
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
            </ul>)}
          </>
        )}
      </div>
    </div>
  );
}
