import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const tips = [
  "Revise seus gastos mensalmente para identificar áreas de economia.",
  "Estabeleça uma reserva de emergência equivalente a 3-6 meses de despesas.",
  "Automatize suas economias transferindo um valor fixo mensalmente.",
  "Compare preços antes de fazer compras grandes para garantir o melhor negócio.",
  "Considere investir em ferramentas que aumentem sua produtividade.",
  "Negocie contratos de serviços recorrentes anualmente para obter descontos.",
  "Mantenha um fundo separado para desenvolvimento profissional.",
  "Documente todas as despesas para facilitar a declaração de impostos.",
  "Revise assinaturas de software periodicamente e cancele as não utilizadas.",
  "Invista em equipamentos de qualidade que terão maior durabilidade.",
  "Considere trabalhar com co-working para reduzir custos fixos.",
  "Mantenha um buffer de 20% no orçamento para despesas imprevistas.",
  "Acompanhe tendências do mercado para precificar seus serviços adequadamente.",
  "Diversifique suas fontes de renda para maior estabilidade financeira.",
  "Faça backup regular de todos os seus trabalhos e arquivos importantes."
];

export default function BudgetTips() {
  const [currentTip, setCurrentTip] = useState(0);

  const getRandomTip = () => {
    const newIndex = Math.floor(Math.random() * tips.length);
    setCurrentTip(newIndex);
  };

  useEffect(() => {
    getRandomTip();
  }, []);

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 shadow-xl">
      <CardHeader className="border-b border-amber-200">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <Lightbulb className="w-5 h-5 text-amber-600" />
          Dica Financeira
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <p className="text-slate-700 leading-relaxed">
          {tips[currentTip]}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={getRandomTip}
          className="w-full border-amber-300 hover:bg-amber-100"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Nova Dica
        </Button>
      </CardContent>
    </Card>
  );
}