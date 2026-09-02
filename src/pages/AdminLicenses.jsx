import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Plus, RefreshCw, Save, ShieldAlert } from 'lucide-react';

const formatDate = (value) => value ? new Date(value).toLocaleString('pt-BR') : 'Vitalícia';
const inputDate = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';
const endOfDay = (value) => value ? new Date(`${value}T23:59:59.999`).toISOString() : null;
const statusLabel = (status) => ({ active: 'Ativa', revoked: 'Revogada', expired: 'Expirada', pending: 'Pendente' }[status] ?? status);
const statuses = ['active', 'pending', 'expired', 'revoked'];

const invokeAdmin = async (body = {}) => {
  const { data, error } = await supabase.functions.invoke('admin-licenses', { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

export default function AdminLicenses() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createMessage, setCreateMessage] = useState('');
  const [form, setForm] = useState({ email: '', name: '', phone: '', productId: '', status: 'active', expiresOn: '' });
  const [edits, setEdits] = useState({});
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-licenses'], queryFn: () => invokeAdmin() });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-licenses'] });

  const createLicense = useMutation({
    mutationFn: (values) => invokeAdmin({ action: 'create_license', email: values.email, name: values.name, phone: values.phone, productId: values.productId, status: values.status, accessEndsAt: endOfDay(values.expiresOn) }),
    onSuccess: (result) => { setForm({ email: '', name: '', phone: '', productId: '', status: 'active', expiresOn: '' }); setCreateError(''); setCreateMessage(result.invite_sent ? 'Licença criada e convite enviado por e-mail.' : result.invite_warning || 'Licença criada com sucesso.'); refresh(); },
    onError: (mutationError) => setCreateError(mutationError.message || 'Não foi possível criar a licença.'),
  });
  const updateLicense = useMutation({
    mutationFn: ({ entitlementId, status, expiresOn }) => invokeAdmin({ action: 'update_license', entitlementId, status, accessEndsAt: endOfDay(expiresOn) }),
    onSuccess: () => { setEdits({}); refresh(); },
  });
  const editFor = (entitlement) => edits[entitlement.id] ?? { status: entitlement.status, expiresOn: inputDate(entitlement.access_ends_at) };
  const changeEdit = (entitlement, change) => setEdits((previous) => ({
    ...previous,
    [entitlement.id]: { status: entitlement.status, expiresOn: inputDate(entitlement.access_ends_at), ...previous[entitlement.id], ...change },
  }));

  if (error) return <div className="p-4 md:p-8"><Card className="max-w-xl p-6"><ShieldAlert className="mb-3 h-8 w-8 text-red-600" /><h1 className="text-xl font-bold">Acesso restrito</h1><p className="mt-2 text-slate-600">Esta área é exclusiva para o administrador.</p></Card></div>;

  return <div className="w-full max-w-none space-y-6 p-4 md:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Licenças</h1><p className="mt-1 text-slate-600 dark:text-slate-400">Gerencie licenças manuais, validade e acesso dos professores.</p></div><div className="flex gap-2"><Button onClick={() => setShowCreate((visible) => !visible)}><Plus className="mr-2 h-4 w-4" />Nova licença</Button><Button variant="outline" onClick={refresh}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button></div></div>

    {showCreate && <Card className="w-full p-4 md:p-6"><h2 className="text-lg font-semibold">Incluir licença</h2><p className="mt-1 text-sm text-slate-500">Ao criar uma licença ativa, enviaremos o convite para o professor definir a senha.</p><form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={(event) => { event.preventDefault(); setCreateError(''); setCreateMessage(''); createLicense.mutate(form); }}>
      <div className="space-y-2"><Label htmlFor="license-name">Nome</Label><Input id="license-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nome do professor" /></div>
      <div className="space-y-2"><Label htmlFor="license-email">E-mail *</Label><Input id="license-email" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="professor@exemplo.com" /></div>
      <div className="space-y-2"><Label htmlFor="license-phone">Telefone</Label><Input id="license-phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="license-product">Produto *</Label><select id="license-product" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })}><option value="">Selecione</option>{data?.products?.filter((product) => product.active).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="license-status">Status</Label><select id="license-status" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="license-expires">Válida até (vazio = vitalícia)</Label><Input id="license-expires" type="date" value={form.expiresOn} onChange={(event) => setForm({ ...form, expiresOn: event.target.value })} /></div>
      <div className="md:col-span-2 xl:col-span-3 flex flex-wrap items-center gap-3"><Button type="submit" disabled={createLicense.isPending}><CheckCircle2 className="mr-2 h-4 w-4" />{createLicense.isPending ? 'Incluindo...' : 'Incluir licença'}</Button>{createError && <p className="text-sm text-red-600">{createError}</p>}{createMessage && <p className="text-sm text-emerald-700">{createMessage}</p>}</div>
    </form></Card>}

    <Card className="w-full p-4"><h2 className="mb-4 text-lg font-semibold">Professores e licenças</h2>{isLoading ? <p className="text-slate-500">Carregando...</p> : <div className="overflow-x-auto"><table className="min-w-[1120px] w-full text-left text-sm"><thead className="border-y bg-slate-50 text-slate-600 dark:bg-slate-900/40"><tr><th className="p-3">Professor</th><th className="p-3">Plano</th><th className="p-3">Status de acesso</th><th className="p-3">Validade</th><th className="p-3">Conta</th><th className="p-3 text-right">Salvar</th></tr></thead><tbody>
      {data?.customers?.flatMap((customer) => (customer.billing_entitlements?.length ? customer.billing_entitlements : [null]).map((entitlement) => {
        const edit = entitlement ? editFor(entitlement) : null;
        return <tr key={entitlement?.id ?? customer.id} className="border-b"><td className="p-3"><p className="font-medium">{customer.name || 'Sem nome'}</p><p className="text-xs text-slate-500">{customer.email}</p></td><td className="p-3">{entitlement?.billing_products?.name || '—'}</td><td className="p-3">{entitlement ? <select className="h-9 rounded-md border border-input bg-transparent px-2" value={edit.status} onChange={(event) => changeEdit(entitlement, { status: event.target.value })}>{statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select> : 'Sem licença'}</td><td className="p-3">{entitlement ? <div className="space-y-1"><Input aria-label="Data de validade; deixe vazio para licença vitalícia" className="w-40" type="date" value={edit.expiresOn} onChange={(event) => changeEdit(entitlement, { expiresOn: event.target.value })} /><p className="text-xs text-slate-500">Atual: {formatDate(entitlement.access_ends_at)}</p></div> : '—'}</td><td className="p-3">{customer.auth_user_id ? <span className="text-emerald-700">Vinculada</span> : <span className="text-amber-700">Aguardando 1º login</span>}</td><td className="p-3 text-right">{entitlement && <Button size="sm" variant="outline" disabled={updateLicense.isPending} onClick={() => updateLicense.mutate({ entitlementId: entitlement.id, ...edit })}><Save className="mr-1 h-4 w-4" />Salvar</Button>}</td></tr>;
      }))}
      {!data?.customers?.length && <tr><td colSpan="6" className="p-6 text-center text-slate-500">Nenhuma compra ou licença registrada.</td></tr>}
    </tbody></table></div>}</Card>

    <Card className="w-full p-4"><h2 className="mb-4 text-lg font-semibold">Últimos eventos do webhook</h2><div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-sm"><thead className="border-y bg-slate-50 text-slate-600 dark:bg-slate-900/40"><tr><th className="p-3">Evento</th><th className="p-3">Status</th><th className="p-3">Erro</th><th className="p-3">Recebido em</th></tr></thead><tbody>{data?.events?.map((event) => <tr key={event.id} className="border-b"><td className="p-3 font-medium">{event.event_type}</td><td className="p-3"><Badge className={event.processing_status === 'processed' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>{event.processing_status}</Badge></td><td className="p-3 text-slate-600">{event.processing_error || '—'}</td><td className="p-3">{formatDate(event.received_at)}</td></tr>)}{!data?.events?.length && <tr><td colSpan="4" className="p-6 text-center text-slate-500">Nenhum evento registrado.</td></tr>}</tbody></table></div></Card>
  </div>;
}
