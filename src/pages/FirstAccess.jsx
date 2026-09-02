import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function FirstAccess() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(''); const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setError(''); setMessage(''); setIsSubmitting(true);
    const normalizedEmail = email.trim().toLowerCase();
    // Para contas já existentes, o Supabase envia o e-mail de recuperação.
    // Para compradores que ainda não possuem conta, a Edge Function envia o convite.
    const [{ error: resetError }, { data, error: firstAccessError }] = await Promise.all([
      supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: `${window.location.origin}/definir-senha` }),
      supabase.functions.invoke('first-access', { body: { email: normalizedEmail } }),
    ]);
    setIsSubmitting(false);
    if (firstAccessError || data?.error) { setError(data?.error || firstAccessError?.message || resetError?.message || 'Não foi possível enviar o link de acesso.'); return; }
    setMessage('Enviamos um link para seu e-mail. Abra-o para definir a senha e acessar o sistema.');
  };
  return <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12 dark:bg-slate-950"><Card className="w-full max-w-md border-slate-200 shadow-lg dark:border-slate-800"><CardHeader className="space-y-2"><CardTitle className="text-2xl font-bold">Primeiro acesso</CardTitle><CardDescription>Informe o e-mail usado na compra. Enviaremos um link seguro para criar sua senha.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={submit}><div className="space-y-2"><Label htmlFor="first-access-email">E-mail</Label><Input id="first-access-email" type="email" placeholder="seu@email.com" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>{error && <p className="text-sm text-red-600">{error}</p>}{message && <p className="text-sm text-emerald-700">{message}</p>}<Button className="w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Enviando...' : 'Receber link para criar senha'}</Button><button type="button" className="w-full text-sm font-medium text-[#094C7E] hover:underline" onClick={() => navigate('/login')}>Voltar para o login</button></form></CardContent></Card></div>;
}
