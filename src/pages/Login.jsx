import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (data.session) navigate('/', { replace: true }); }); }, [navigate]);
  const submit = async (event) => {
    event.preventDefault(); setError(''); setMessage(''); setIsSubmitting(true);
    if (isRecoveryMode) {
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/definir-senha` });
      setIsSubmitting(false);
      if (recoveryError) setError(recoveryError.message || 'Não foi possível enviar o e-mail de recuperação.');
      else setMessage('Se houver uma conta com este e-mail, você receberá as instruções para redefinir a senha.');
      return;
    }
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);
    if (signInError) { setError(signInError.message || 'Não foi possível entrar.'); return; }
    if (data.session) navigate('/', { replace: true });
  };
  return <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12 dark:bg-slate-950"><Card className="w-full max-w-md border-slate-200 shadow-lg dark:border-slate-800"><CardHeader className="space-y-2"><CardTitle className="text-2xl font-bold">{isRecoveryMode ? 'Recuperar senha' : 'Entrar'}</CardTitle><CardDescription>{isRecoveryMode ? 'Informe seu e-mail para receber as instruções de recuperação.' : 'Use o mesmo e-mail informado na compra pela Kiwify.'}</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={submit}><div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>{!isRecoveryMode && <div className="space-y-2"><Label htmlFor="password">Senha</Label><div className="relative"><Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} required className="pr-10" /><Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></div>}{error && <p className="text-sm text-red-600">{error}</p>}{message && <p className="text-sm text-green-600">{message}</p>}<Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Aguarde...' : isRecoveryMode ? 'Enviar instruções' : 'Entrar'}</Button><button type="button" className="w-full text-sm font-medium text-[#094C7E] hover:underline" onClick={() => { setIsRecoveryMode((current) => !current); setError(''); setMessage(''); }}>{isRecoveryMode ? 'Voltar para o login' : 'Esqueci minha senha'}</button>{!isRecoveryMode && <button type="button" className="w-full text-sm font-medium text-[#094C7E] hover:underline" onClick={() => navigate('/primeiro-acesso')}>1º acesso — criar minha senha</button>}</form></CardContent></Card></div>;
}
