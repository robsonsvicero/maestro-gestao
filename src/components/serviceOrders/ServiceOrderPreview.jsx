import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Printer, PlayCircle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const statusConfig = {
  pending: { label: "Pendente", class: "bg-yellow-100 text-yellow-800" },
  in_progress: { label: "Em Andamento", class: "bg-blue-100 text-blue-800" },
  completed: { label: "Concluída", class: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelada", class: "bg-red-100 text-red-800" }
};

export default function ServiceOrderPreview({ order, companySettings, onClose, onStatusChange }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex gap-3 no-print">
          <Button variant="outline" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          {order.status === 'pending' && (
            <Button 
              onClick={() => onStatusChange('in_progress')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Iniciar Serviço
            </Button>
          )}
          {order.status === 'in_progress' && (
            <Button 
              onClick={() => onStatusChange('completed')}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Concluir Serviço
            </Button>
          )}
          {(order.status === 'pending' || order.status === 'in_progress') && (
            <Button 
              variant="destructive"
              onClick={() => onStatusChange('cancelled')}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          )}
        </div>

        <Card className="bg-white p-8 md:p-12 shadow-xl">
          <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-[#094C7E] pb-6">
              <div>
                <h1 className="text-3xl font-bold text-[#094C7E] mb-2">
                  {companySettings?.company_name || "Minha Empresa"}
                </h1>
                {companySettings?.cnpj && (
                  <p className="text-slate-600">CNPJ: {companySettings.cnpj}</p>
                )}
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-slate-900">ORDEM DE SERVIÇO</h2>
                <p className="text-slate-600 mt-1">{order.order_number}</p>
                <Badge className={`${statusConfig[order.status]?.class} mt-2`}>
                  {statusConfig[order.status]?.label}
                </Badge>
              </div>
            </div>

            {/* Dates and Client Info */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Cliente</h3>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{order.client_name}</p>
                  <p className="text-slate-600">{order.client_email}</p>
                  <p className="text-slate-600">{order.client_phone}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Informações do Serviço</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Data de Início:</span>
                    <span className="font-medium">
                      {format(new Date(order.start_date), "dd/MM/yyyy")}
                    </span>
                  </div>
                  {order.deadline && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Prazo:</span>
                      <span className="font-medium">
                        {format(new Date(order.deadline), "dd/MM/yyyy")}
                      </span>
                    </div>
                  )}
                  {order.completion_date && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Data de Conclusão:</span>
                      <span className="font-medium text-green-600">
                        {format(new Date(order.completion_date), "dd/MM/yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Serviços</h3>
              <table className="w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold">Serviço</th>
                    <th className="text-left p-3 text-sm font-semibold">Descrição</th>
                    <th className="text-center p-3 text-sm font-semibold">Qtd</th>
                    <th className="text-right p-3 text-sm font-semibold">Valor Unit.</th>
                    <th className="text-right p-3 text-sm font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-3 text-sm">{item.service}</td>
                      <td className="p-3 text-sm text-slate-600">{item.description}</td>
                      <td className="p-3 text-sm text-center">{item.quantity}</td>
                      <td className="p-3 text-sm text-right">
                        R$ {item.unit_price.toFixed(2)}
                      </td>
                      <td className="p-3 text-sm text-right font-medium">
                        R$ {item.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex justify-end">
              <div className="w-80">
                <div className="flex justify-between text-xl font-bold border-t-2 pt-4">
                  <span>Valor Total:</span>
                  <span className="text-[#094C7E]">R$ {order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="border-t pt-6">
                <h3 className="font-semibold text-slate-900 mb-2">Observações</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-sm text-slate-500 border-t pt-6">
              <p>Esta ordem de serviço foi gerada eletronicamente.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}