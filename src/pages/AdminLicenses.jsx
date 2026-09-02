import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';

const formatDate = (value) => value ? new Date(value).toLocaleString('pt-BR') : 'Sem prazo';
const statusStyle = (status) => ({ active: 'bg-emerald-100 text-emerald-800', revoked: 'bg-red-100 text-red-800', expired: 'bg-amber-100 text-amber-800', pending: 'bg-slate-100 text-slate-800' }[status] ?? 'bg-slate-100 text-slate-800');

const invokeAdmin = async (body = {}) => {
  const { data, error } = await supabase.functions.invoke('admin-licenses', { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

export default function AdminLicenses() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-licenses'], queryFn: () => invokeAdmin() });
  const updateLicense = useMutation({
    mutationFn: ({ action, entitlementId }) => invokeAdmin({ action, entitlementId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-licenses'] }),
  });

  if (error) {
    return <div className="p-4 md:p-8"><Card className="max-w-xl p-6"><ShieldAlert className="mb-3 h-8 w-8 text-red-600" /><h1 className="text-xl font-bold">Acesso restrito</h1><p className="mt-2 text-slate-600">Esta área é exclusiva para o administrador.</p></Card></div>;
  }

  return (
    <div className="w-full max-w-none space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Licenças</h1><p className="mt-1 text-slate-600 dark:text-slate-400">Acompanhe compras, acessos e eventos recebidos da Kiwify.</p></div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-licenses'] })}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button>
      </div>

      <Card className="w-full p-4">
        <h2 className="mb-4 text-lg font-semibold">Professores e licenças</h2>
        {isLoading ? <p className="text-slate-500">Carregando...</p> : (
          <div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left text-sm"><thead className="border-y bg-slate-50 text-slate-600 dark:bg-slate-900/40"><tr><th className="p-3">Professor</th><th className="p-3">Plano</th><th className="p-3">Licença</th><th className="p-3">Validade</th><th className="p-3">Conta</th><th className="p-3 text-right">Ação</th></tr></thead><tbody>
            {data?.customers?.map((customer) => {
              const entitlement = customer.billing_entitlements?.[0];
              const product = entitlement?.billing_products;
              return <tr key={customer.id} className="border-b"><td className="p-3"><p className="font-medium">{customer.name || 'Sem nome'}</p><p className="text-xs text-slate-500">{customer.email}</p></td><td className="p-3">{product?.name || '—'}</td><td className="p-3">{entitlement ? <Badge className={statusStyle(entitlement.status)}>{entitlement.status}</Badge> : 'Sem licença'}</td><td className="p-3">{formatDate(entitlement?.access_ends_at)}</td><td className="p-3">{customer.auth_user_id ? <span className="text-emerald-700">Vinculada</span> : <span className="text-amber-700">Pendente</span>}</td><td className="p-3 text-right">{entitlement && (entitlement.status === 'active' ? <Button size="sm" variant="outline" className="text-red-600" disabled={updateLicense.isPending} onClick={() => updateLicense.mutate({ action: 'revoke', entitlementId: entitlement.id })}><XCircle className="mr-1 h-4 w-4" />Revogar</Button> : <Button size="sm" variant="outline" disabled={updateLicense.isPending} onClick={() => updateLicense.mutate({ action: 'activate', entitlementId: entitlement.id })}><CheckCircle2 className="mr-1 h-4 w-4" />Liberar</Button>)}</td></tr>;
            })}
            {!data?.customers?.length && <tr><td colSpan="6" className="p-6 text-center text-slate-500">Nenhuma compra registrada.</td></tr>}
          </tbody></table></div>
        )}
      </Card>

      <Card className="w-full p-4"><h2 className="mb-4 text-lg font-semibold">Últimos eventos do webhook</h2><div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-sm"><thead className="border-y bg-slate-50 text-slate-600 dark:bg-slate-900/40"><tr><th className="p-3">Evento</th><th className="p-3">Status</th><th className="p-3">Erro</th><th className="p-3">Recebido em</th></tr></thead><tbody>{data?.events?.map((event) => <tr key={event.id} className="border-b"><td className="p-3 font-medium">{event.event_type}</td><td className="p-3"><Badge className={event.processing_status === 'processed' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>{event.processing_status}</Badge></td><td className="p-3 text-slate-600">{event.processing_error || '—'}</td><td className="p-3">{formatDate(event.received_at)}</td></tr>)}{!data?.events?.length && <tr><td colSpan="4" className="p-6 text-center text-slate-500">Nenhum evento registrado.</td></tr>}</tbody></table></div></Card>
    </div>
  );
}
