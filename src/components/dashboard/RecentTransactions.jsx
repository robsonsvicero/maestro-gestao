import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

const categoryLabels = {
  lesson_payment: "Pagamento de Aula",
  instrument_rental: "Aluguel de Instrumento",
  sheet_music: "Partituras",
  supplies: "Material",
  software: "Software",
  marketing: "Marketing",
  utilities: "Utilidades",
  transportation: "Transporte",
  training: "Treinamento",
  other: "Outros"
};

export default function RecentTransactions({ transactions, isLoading, theme }) {
  if (isLoading) {
    return (
      <Card className={`backdrop-blur-xl shadow-xl ${
        theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-white/60 border-slate-200'
      }`}>
        <CardHeader className={`border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#094C7E]" />
            Transações Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between py-4 border-b last:border-0">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`backdrop-blur-xl shadow-xl ${
      theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-white/60 border-slate-200'
    }`}>
      <CardHeader className={`border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
        <CardTitle className={`flex items-center gap-2 ${
          theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
        }`}>
          <Clock className="w-5 h-5 text-[#094C7E]" />
          Transações Recentes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <p className={`text-center py-8 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Nenhuma transação registrada
            </p>
          ) : (
            transactions.map((transaction) => (
              <div 
                key={transaction.id} 
                className={`flex items-center justify-between py-4 border-b last:border-0 rounded-lg px-3 transition-colors ${
                  theme === 'dark' 
                    ? 'border-slate-700 hover:bg-slate-700/50' 
                    : 'border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${
                    transaction.type === 'income' 
                      ? 'bg-green-100' 
                      : 'bg-red-100'
                  }`}>
                    {transaction.type === 'income' ? (
                      <ArrowUpRight className="w-5 h-5 text-green-600" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className={`font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                      {transaction.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {categoryLabels[transaction.category]}
                      </Badge>
                      <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        {format(new Date(transaction.date), "d 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>
                <p className={`text-lg font-bold ${
                  transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'} R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}