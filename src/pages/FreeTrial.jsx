import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function FreeTrial() {
  const navigate = useNavigate();
  const { isAuthenticated, refreshAccess } = useAuth();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  useEffect(() => {
    if (!isAuthenticated) return;
    let mounted = true;
    const activateTrial = async () => {
      setIsSubmitting(true);
      const { data, error: trialError } = await supabase.functions.invoke('start-trial');
      if (!mounted) return;
      if (trialError || data?.error) { setError(data?.error || trialError?.message || 'Não foi possível iniciar o teste gratuito.'); setIsSubmitting(false); return; }
      const status = await refreshAccess();
      if (mounted && status === 'active') navigate('/', { replace: true });
      else if (mounted) setIsSubmitting(false);
    };
    activateTrial(); return () => { mounted = false; };
  }, [isAuthenticated, navigate, refreshAccess]);
  const submit = async (event) => {
    event.preventDefault(); setError(''); setMessage(''); setIsSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/teste-gratis` } });
    if (signUpError) { setError(signUpError.message || 'Não foi possível criar sua conta.'); setIsSubmitting(false); return; }
    if (!data.session) { setMessage('Conta criada. Confirme o e-mail recebido para iniciar seus 14 dias gratuitos.'); setIsSubmitting(false); }
  };
  if (isAuthenticated) return <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4"><p className="text-slate-600">Ativando seu teste gratuito...</p></div>;
  return <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12 dark:bg-slate-950"><Card className="w-full max-w-md shadow-lg"><CardHeader className="space-y-2"><CardTitle className="text-2xl">Teste grátis por 14 dias</CardTitle><CardDescription>Crie sua conta e experimente o Maestro Gestão sem compromisso.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={submit}><div className="space-y-2"><Label htmlFor="trial-email">E-mail</Label><Input id="trial-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="trial-password">Senha</Label><Input id="trial-password" type="password" required minLength="6" value={password} onChange={(event) => setPassword(event.target.value)} /></div>{error && <p className="text-sm text-red-600">{error}</p>}{message && <p className="text-sm text-emerald-700">{message}</p>}<Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Aguarde...' : 'Começar teste grátis'}</Button><button type="button" className="w-full text-sm font-medium text-[#094C7E] hover:underline" onClick={() => navigate('/login')}>Já tenho uma conta</button></form></CardContent></Card></div>;
}
