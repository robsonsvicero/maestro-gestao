import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Lightbulb, TrendingUp } from "lucide-react";
import { startOfMonth, endOfMonth } from "date-fns";

import BudgetForm from "../components/budget/BudgetForm";
import BudgetChart from "../components/budget/BudgetChart";
import BudgetTips from "../components/budget/BudgetTips";
import CategoryExpenses from "../components/budget/CategoryExpenses";

export default function Budget() {
  const [showForm, setShowForm] = useState(false);
  const [currentDate] = useState(new Date());
  const queryClient = useQueryClient();

  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const { data, error } = await supabase.from('budget').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('transaction').select('*');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const { data: budget, error } = await supabase
        .from('budget')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return budget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setShowForm(false);
    },
  });

  const currentBudget = budgets.find(
    b => b.month === currentMonth && b.year === currentYear
  );

  const monthTransactions = transactions.filter(t => {
    const tDate = new Date(t.date);
    return tDate >= startOfMonth(currentDate) && 
           tDate <= endOfMonth(currentDate) &&
           t.type === 'expense';
  });

  const categoryTotals = monthTransactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});

  const totalExpenses = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Orçamento
          </h1>
          <p className="text-slate-600">Planeje e acompanhe seus gastos mensais</p>
        </div>
        {!currentBudget && (
          <Button 
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94] hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Orçamento
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="p-6 bg-white/60 backdrop-blur-xl border-slate-200 shadow-xl">
          <BudgetForm
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
            currentMonth={currentMonth}
            currentYear={currentYear}
          />
        </Card>
      )}

      {currentBudget ? (
        <>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0 shadow-lg">
              <CardContent className="p-6">
                <p className="text-sm text-slate-600 mb-2">Orçamento Total</p>
                <p className="text-3xl font-bold text-[#094C7E]">
                  R$ {currentBudget.total_budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-0 shadow-lg">
              <CardContent className="p-6">
                <p className="text-sm text-slate-600 mb-2">Total Gasto</p>
                <p className="text-3xl font-bold text-red-600">
                  R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-lg">
              <CardContent className="p-6">
                <p className="text-sm text-slate-600 mb-2">Saldo Restante</p>
                <p className={`text-3xl font-bold ${
                  currentBudget.total_budget - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  R$ {(currentBudget.total_budget - totalExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <BudgetChart 
                budget={currentBudget} 
                categoryTotals={categoryTotals}
              />
              <CategoryExpenses 
                budget={currentBudget} 
                categoryTotals={categoryTotals}
              />
            </div>
            <BudgetTips />
          </div>
        </>
      ) : (
        <Card className="p-12 bg-white/60 backdrop-blur-xl border-slate-200 shadow-xl">
          <div className="text-center">
            <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Nenhum orçamento definido
            </h3>
            <p className="text-slate-600 mb-6">
              Crie um orçamento mensal para acompanhar suas despesas
            </p>
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Orçamento
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}