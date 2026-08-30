import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle } from "lucide-react";

const categoryLabels = {
  software: "Software",
  hardware: "Hardware",
  office_supplies: "Material de Escritório",
  marketing: "Marketing",
  utilities: "Utilidades",
  transportation: "Transporte",
  training: "Treinamento",
  other: "Outros"
};

export default function CategoryExpenses({ budget, categoryTotals }) {
  const categoryBudgets = budget.category_budgets || {};

  return (
    <Card className="bg-white/60 backdrop-blur-xl border-slate-200 shadow-xl">
      <CardHeader className="border-b border-slate-200">
        <CardTitle className="text-slate-900">Gastos por Categoria</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {Object.entries(categoryBudgets).map(([category, budgetAmount]) => {
          const spent = categoryTotals[category] || 0;
          const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
          const isOverBudget = percentage > 100;

          return (
            <div key={category} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">
                    {categoryLabels[category]}
                  </span>
                  {isOverBudget ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  ) : percentage >= 90 ? (
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <span className="text-sm text-slate-600">
                  R$ {spent.toFixed(2)} / R$ {budgetAmount.toFixed(2)}
                </span>
              </div>
              <Progress 
                value={Math.min(percentage, 100)} 
                className={`h-2 ${isOverBudget ? '[&>div]:bg-red-500' : percentage >= 90 ? '[&>div]:bg-orange-500' : '[&>div]:bg-[#094C7E]'}`}
              />
              <p className="text-xs text-slate-500">
                {percentage.toFixed(1)}% utilizado
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}