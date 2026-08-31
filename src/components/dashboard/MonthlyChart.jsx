import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { format, startOfMonth, addDays } from "date-fns";

export default function MonthlyChart({ transactions, theme }) {
  const generateChartData = () => {
    const days = [];
    const start = startOfMonth(new Date());

    for (let i = 0; i < 30; i++) {
      const day = addDays(start, i);
      const dayTransactions = transactions.filter(t => 
        format(new Date(t.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      );

      days.push({
        day: format(day, 'd'),
        Receitas: dayTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0),
        Despesas: dayTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0),
      });
    }

    return days;
  };

  const data = generateChartData();

  return (
    <Card className={`backdrop-blur-xl shadow-xl ${
      theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-white/60 border-slate-200'
    }`}>
      <CardHeader className={`border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
        <CardTitle className={`flex items-center gap-2 ${
          theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
        }`}>
          <TrendingUp className="w-5 h-5 text-[#094C7E]" />
          Fluxo de Caixa Mensal
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#475569' : '#e2e8f0'} />
            <XAxis 
              dataKey="day" 
              stroke={theme === 'dark' ? '#94a3b8' : '#64748b'}
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke={theme === 'dark' ? '#94a3b8' : '#64748b'}
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `R$ ${value}`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: theme === 'dark' ? '#1e293b' : 'rgba(255, 255, 255, 0.95)',
                border: theme === 'dark' ? '1px solid #475569' : '1px solid #e2e8f0',
                borderRadius: '8px',
                backdropFilter: 'blur(10px)',
                color: theme === 'dark' ? '#f1f5f9' : '#0f172a'
              }}
              formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            />
            <Legend />
            <Bar dataKey="Receitas" fill="#10b981" radius={[8, 8, 0, 0]} />
            <Bar dataKey="Despesas" fill="#ef4444" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}