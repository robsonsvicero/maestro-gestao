import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ServiceOrderList from "../components/serviceOrders/ServiceOrderList";
import ServiceOrderPreview from "../components/serviceOrders/ServiceOrderPreview";

export default function ServiceOrders() {
  const [previewOrder, setPreviewOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['serviceOrders'],
    queryFn: () => base44.entities.ServiceOrder.list('-created_date'),
  });

  const { data: companySettings = [] } = useQuery({
    queryKey: ['companySettings'],
    queryFn: () => base44.entities.CompanySettings.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ServiceOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['serviceOrders']);
      setPreviewOrder(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ServiceOrder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['serviceOrders']);
    },
  });

  const handleStatusChange = (order, newStatus) => {
    const updateData = { ...order, status: newStatus };
    
    if (newStatus === 'completed' && !order.completion_date) {
      updateData.completion_date = new Date().toISOString().split('T')[0];
    }
    
    updateMutation.mutate({ id: order.id, data: updateData });
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir esta ordem de serviço?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (previewOrder) {
    return (
      <ServiceOrderPreview
        order={previewOrder}
        companySettings={companySettings[0]}
        onClose={() => setPreviewOrder(null)}
        onStatusChange={(newStatus) => handleStatusChange(previewOrder, newStatus)}
      />
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Ordens de Serviço
          </h1>
          <p className="text-slate-600">Acompanhe o andamento dos seus serviços</p>
        </div>
      </div>

      <Card className="p-4 bg-white/60 backdrop-blur-xl border-slate-200 shadow-lg">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar por cliente ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="in_progress">Em Andamento</TabsTrigger>
              <TabsTrigger value="completed">Concluídas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      <ServiceOrderList
        orders={filteredOrders}
        isLoading={isLoading}
        onPreview={setPreviewOrder}
        onDelete={handleDelete}
      />
    </div>
  );
}