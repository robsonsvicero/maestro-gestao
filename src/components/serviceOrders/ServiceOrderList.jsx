import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

const statusConfig = {
  pending: { label: "Pendente", class: "bg-yellow-100 text-yellow-800" },
  in_progress: { label: "Em Andamento", class: "bg-blue-100 text-blue-800" },
  completed: { label: "Concluída", class: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelada", class: "bg-red-100 text-red-800" }
};

export default function ServiceOrderList({ orders, isLoading, onPreview, onDelete }) {
  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="p-6 bg-white/60 backdrop-blur-xl animate-pulse">
            <div className="h-32 bg-slate-200 rounded" />
          </Card>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="p-12 bg-white/60 backdrop-blur-xl border-slate-200 shadow-xl">
        <p className="text-center text-slate-500">Nenhuma ordem de serviço encontrada</p>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {orders.map((order) => (
        <motion.div
          key={order.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="bg-white/60 backdrop-blur-xl border-slate-200 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="border-b border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{order.order_number}</CardTitle>
                  <p className="text-sm text-slate-600 mt-1">{order.client_name}</p>
                </div>
                <Badge className={statusConfig[order.status]?.class}>
                  {statusConfig[order.status]?.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Início:</span>
                <span className="font-medium">
                  {format(new Date(order.start_date), "dd/MM/yyyy")}
                </span>
              </div>
              {order.deadline && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Prazo:</span>
                  <span className="font-medium">
                    {format(new Date(order.deadline), "dd/MM/yyyy")}
                  </span>
                </div>
              )}
              {order.completion_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Conclusão:</span>
                  <span className="font-medium text-green-600">
                    {format(new Date(order.completion_date), "dd/MM/yyyy")}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <span className="text-slate-600">Total:</span>
                <span className="text-xl font-bold text-[#094C7E]">
                  R$ {order.total.toFixed(2)}
                </span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onPreview(order)}
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Ver Detalhes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(order.id)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}