import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Wallet,
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";

import StatCard from "../components/dashboard/StatCard";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import MonthlyChart from "../components/dashboard/MonthlyChart";

export default function Dashboard() {
  const [currentMonth] = useState(new Date());

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transaction')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('student').select('*');
      if (error) throw error;
      return data;
    },
  });

  const getMonthTransactions = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= start && tDate <= end;
    });
  };

  const getYearTransactions = () => {
    const start = startOfYear(currentMonth);
    return transactions.filter(t => new Date(t.date) >= start);
  };

  const calculateTotals = (transactionList) => {
    const income = transactionList
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactionList
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  };

  const monthTransactions = getMonthTransactions();
  const yearTransactions = getYearTransactions();
  const monthTotals = calculateTotals(monthTransactions);
  void yearTransactions;

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-slate-900 dark:text-slate-100">
            Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Link to={createPageUrl("Finances")}>
          <Button className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94] hover:shadow-lg transition-all">
            <Plus className="w-4 h-4 mr-2" />
            Nova Transação
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Receita do Mês"
          value={`R$ ${monthTotals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={ArrowUpRight}
          iconColor="text-green-600"
          bgGradient="from-green-50 to-emerald-50"
          trend={`${monthTransactions.filter(t => t.type === 'income').length} entradas`}
        />
        <StatCard
          title="Despesas do Mês"
          value={`R$ ${monthTotals.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={ArrowDownRight}
          iconColor="text-red-600"
          bgGradient="from-red-50 to-rose-50"
          trend={`${monthTransactions.filter(t => t.type === 'expense').length} saídas`}
        />
        <StatCard
          title="Saldo do Mês"
          value={`R$ ${monthTotals.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={Wallet}
          iconColor="text-[#094C7E]"
          bgGradient="from-blue-50 to-cyan-50"
          trend={monthTotals.balance >= 0 ? "Positivo" : "Negativo"}
        />
        <StatCard
          title="Alunos Ativos"
          value={students.length}
          icon={Users}
          iconColor="text-purple-600"
          bgGradient="from-purple-50 to-pink-50"
          trend="Total cadastrados"
        />
      </div>

      <div className="grid lg:grid-cols-1 gap-6">
        <MonthlyChart transactions={monthTransactions} />
      </div>

      <RecentTransactions transactions={transactions.slice(0, 10)} isLoading={isLoading} />
    </div>
  );
}