import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import QuoteForm from "../components/quotes/QuoteForm";
import QuoteList from "../components/quotes/QuoteList";
import QuotePreview from "../components/quotes/QuotePreview";

export default function Quotes() {
  const [showForm, setShowForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [previewQuote, setPreviewQuote] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: companySettings = [] } = useQuery({
    queryKey: ['companySettings'],
    queryFn: () => base44.entities.CompanySettings.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Quote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['quotes']);
      setShowForm(false);
      setEditingQuote(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Quote.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['quotes']);
      setShowForm(false);
      setEditingQuote(null);
      setPreviewQuote(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Quote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['quotes']);
    },
  });

  const createServiceOrderMutation = useMutation({
    mutationFn: async (quote) => {
      const orderNumber = `OS-${Date.now()}`;
      await base44.entities.ServiceOrder.create({
        order_number: orderNumber,
        quote_id: quote.id,
        client_id: quote.client_id,
        client_name: quote.client_name,
        client_email: quote.client_email,
        client_phone: quote.client_phone,
        status: "pending",
        start_date: new Date().toISOString().split('T')[0],
        items: quote.items,
        total: quote.total,
        notes: `Gerado a partir do orçamento ${quote.quote_number}`
      });
      
      await base44.entities.Quote.update(quote.id, { status: "approved" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['quotes']);
      queryClient.invalidateQueries(['serviceOrders']);
      setPreviewQuote(null);
    },
  });

  const handleSubmit = (data) => {
    if (editingQuote) {
      updateMutation.mutate({ id: editingQuote.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (quote) => {
    setEditingQuote(quote);
    setShowForm(true);
    setPreviewQuote(null);
  };

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir este orçamento?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleApprove = (quote) => {
    if (confirm('Aprovar este orçamento e gerar ordem de serviço?')) {
      createServiceOrderMutation.mutate(quote);
    }
  };

  const handleStatusChange = (quote, newStatus) => {
    updateMutation.mutate({ id: quote.id, data: { ...quote, status: newStatus } });
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.quote_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (previewQuote) {
    return (
      <QuotePreview
        quote={previewQuote}
        companySettings={companySettings[0]}
        onClose={() => setPreviewQuote(null)}
        onApprove={() => handleApprove(previewQuote)}
        onStatusChange={(newStatus) => handleStatusChange(previewQuote, newStatus)}
      />
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Orçamentos
          </h1>
          <p className="text-slate-600">Crie e gerencie orçamentos para seus clientes</p>
        </div>
        <Button 
          onClick={() => {
            setEditingQuote(null);
            setShowForm(!showForm);
          }}
          className="bg-gradient-to-r from-[#094C7E] to-[#0A5A94] hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Orçamento
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 bg-white/60 backdrop-blur-xl border-slate-200 shadow-xl">
          <QuoteForm
            quote={editingQuote}
            clients={clients}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingQuote(null);
            }}
          />
        </Card>
      )}

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
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="approved">Aprovados</TabsTrigger>
              <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      <QuoteList
        quotes={filteredQuotes}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPreview={setPreviewQuote}
      />
    </div>
  );
}