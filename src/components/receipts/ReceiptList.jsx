import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { parseLocalDate } from "@/utils/dateUtils";
import { motion } from "framer-motion";

const paymentMethodLabels = {
  cash: "Dinheiro",
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  pix: "PIX",
  bank_transfer: "Transferência"
};

export default function ReceiptList({ receipts, isLoading, onPreview, onDelete, theme }) {
  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className={`backdrop-blur-xl animate-pulse ${
            theme === 'dark' ? 'bg-slate-800/60' : 'bg-white/60'
          }`}>
            <CardContent className="p-6">
              <div className={`h-32 rounded ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`} />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <Card className={`p-12 backdrop-blur-xl shadow-xl ${
        theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-white/60 border-slate-200'
      }`}>
        <p className={`text-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
          Nenhum recibo encontrado
        </p>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {receipts.map((receipt) => (
        <motion.div
          key={receipt.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Card className={`backdrop-blur-xl shadow-lg hover:shadow-xl transition-all ${
            theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-white/60 border-slate-200'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className={`font-bold text-lg ${
                    theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                    {receipt.receipt_number}
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {receipt.student_name}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => onPreview(receipt)}
                    className="text-[#094C7E] hover:bg-blue-50"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => onDelete(receipt.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className={`flex items-center gap-2 text-sm ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  <Calendar className="w-4 h-4 text-[#094C7E]" />
                  {format(parseLocalDate(receipt.payment_date), "dd/MM/yyyy")}
                </div>

                <div className={`flex items-center gap-2 font-semibold text-lg ${
                  theme === 'dark' ? 'text-green-400' : 'text-green-600'
                }`}>
                  <DollarSign className="w-5 h-5" />
                  R$ {receipt.amount.toFixed(2)}
                </div>

                <Badge variant="outline" className="text-xs">
                  {paymentMethodLabels[receipt.payment_method]}
                </Badge>

                <p className={`text-sm line-clamp-2 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {receipt.description}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
