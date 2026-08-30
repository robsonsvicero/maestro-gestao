import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { BarChart3 } from "lucide-react";

const COLORS = ['#094C7E', '#0A5A94', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const categoryLabels = {
  software: "Software",
  hardware: "Hardware",
  office_supplies: "Material",
  marketing: "Marketing",
  utilities: "Utilidades",
  transportation: "Transporte",
  training: "Treinamento",
  other: "Outros"
};

export default function BudgetChart({ budget, categoryTotals }) {
  const data = Object.entries(categoryTotals).map(([category, amount]) => ({
    name: categoryLabels[category] || category,
    value: amount
  }));

  return (
    <Card className="bg-white/60 backdrop-blur-xl border-slate-200 shadow-xl">
      <CardHeader className="border-b border-slate-200">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <BarChart3 className="w-5 h-5 text-[#094C7E]" />
          Distribuição de Gastos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-slate-500">
            Nenhuma despesa registrada neste mês
          </div>
        )}
      </CardContent>
    </Card>
  );
}