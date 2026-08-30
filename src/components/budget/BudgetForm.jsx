import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const categories = [
  { key: "software", label: "Software" },
  { key: "hardware", label: "Hardware" },
  { key: "office_supplies", label: "Material de Escritório" },
  { key: "marketing", label: "Marketing" },
  { key: "utilities", label: "Utilidades" },
  { key: "transportation", label: "Transporte" },
  { key: "training", label: "Treinamento" },
  { key: "other", label: "Outros" }
];

export default function BudgetForm({ onSubmit, onCancel, currentMonth, currentYear }) {
  const [totalBudget, setTotalBudget] = useState("");
  const [categoryBudgets, setCategoryBudgets] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      month: currentMonth,
      year: currentYear,
      total_budget: parseFloat(totalBudget),
      category_budgets: Object.fromEntries(
        Object.entries(categoryBudgets).map(([key, val]) => [key, parseFloat(val) || 0])
      )
    });
  };

  const distributeBudget = () => {
    const total = parseFloat(totalBudget) || 0;
    const perCategory = (total / categories.length).toFixed(2);
    const distributed = {};
    categories.forEach(cat => {
      distributed[cat.key] = perCategory;
    });
    setCategoryBudgets(distributed);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="total_budget">Orçamento Total do Mês (R$)</Label>
        <div className="flex gap-2">
          <Input
            id="total_budget"
            type="number"
            step="0.01"
            value={totalBudget}
            onChange={(e) => setTotalBudget(e.target.value)}
            placeholder="0,00"
            required
            className="flex-1"
          />
          <Button 
            type="button" 
            variant="outline"
            onClick={distributeBudget}
            disabled={!totalBudget}
          >
            Distribuir Igualmente
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-base font-semibold">Orçamento por Categoria</Label>
        <div className="grid md:grid-cols-2 gap-4">
          {categories.map(cat => (
            <div key={cat.key} className="space-y-2">
              <Label htmlFor={cat.key}>{cat.label}</Label>
              <Input
                id={cat.key}
                type="number"
                step="0.01"
                value={categoryBudgets[cat.key] || ''}
                onChange={(e) => setCategoryBudgets({
                  ...categoryBudgets,
                  [cat.key]: e.target.value
                })}
                placeholder="0,00"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94]">
          Criar Orçamento
        </Button>
      </div>
    </form>
  );
}