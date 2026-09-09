import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(() => searchParams.get('blocked') ?? '');
  const [message, setMessage] = useState('');
  const getErrorMessageForAccess = (status, reason) => {
    if (status === 'email_confirmation_required') {
      return 'Seu e-mail ainda não foi confirmado. Verifique a caixa de entrada do seu e-mail para confirmar a conta antes de entrar.';
    }
    if (status === 'email_required') {
      return 'E-mail não identificado na conta.';
    }
    if (reason === 'canceled') {
      return 'Sua assinatura foi cancelada. Caso deseje reativar seu acesso, entre em contato com o suporte ou adquira um novo plano.';
    }
    if (reason === 'expired') {
      return 'Sua licença ou período de teste expirou. Renove sua assinatura para continuar acessando o sistema.';
    }
    if (reason === 'suspended') {
      return 'Seu acesso está temporariamente suspenso. Por favor, entre em contato com o suporte.';
    }
    if (reason === 'pending') {
      return 'Seu pagamento ou liberação de licença ainda está pendente de confirmação.';
    }
    return 'Não encontramos nenhuma licença ativa vinculada a este e-mail. Verifique se digitou o mesmo e-mail utilizado na compra.';
  };

  const navigateAfterLogin = async (session) => {
    const { data: access, error: accessError } = await supabase.functions.invoke('activate-access', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (accessError) {
      // Se a Edge Function retornou status HTTP de erro (ex: 403 email_confirmation_required)
      const errorStatus = accessError?.context?.status || accessError?.status;
      let msg;
      if (errorStatus === 403 || access?.status === 'email_confirmation_required') {
        msg = 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada para confirmar a conta antes de entrar.';
      } else {
        msg = accessError.message || 'Não foi possível verificar seu acesso.';
      }
      await supabase.auth.signOut();
      // Redireciona para /login com a mensagem codificada na URL, pois o signOut
      // dispara um re-mount do componente via AuthContext → App.jsx.
      navigate(`/login?blocked=${encodeURIComponent(msg)}`, { replace: true });
      return;
    }

    if (access?.status !== 'active') {
      const msg = getErrorMessageForAccess(access?.status, access?.access_reason);
      await supabase.auth.signOut();
      navigate(`/login?blocked=${encodeURIComponent(msg)}`, { replace: true });
      return;
    }

    navigate(access?.is_admin ? '/admin-licenses' : createPageUrl('Schedule'), { replace: true });
  };

  // Lê mensagem de bloqueio da URL (ex: /login?blocked=...) e limpa o parâmetro
  useEffect(() => {
    const blocked = searchParams.get('blocked');
    if (blocked) {
      setError(blocked);
      // Remove o parâmetro da URL sem re-renderizar
      setSearchParams({}, { replace: true });
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => {
        if (data.session) {
          navigateAfterLogin(data.session).catch((err) => {
            setError(err.message || 'Acesso não liberado.');
          });
        }
      })
      .catch((sessionError) => setError(sessionError.message || 'Não foi possível verificar o acesso.'));
  }, [navigate]);

  const submit = async (event) => {
    event.preventDefault(); setError(''); setMessage(''); setIsSubmitting(true);
    if (isRecoveryMode) {
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/definir-senha` });
      setIsSubmitting(false);
      if (recoveryError) setError(recoveryError.message || 'Não foi possível enviar o e-mail de recuperação.');
      else setMessage('Se houver uma conta com este e-mail, você receberá as instruções para redefinir a senha.');
      return;
    }
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (signInError) {
      setIsSubmitting(false);
      setError(signInError.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : (signInError.message || 'Não foi possível entrar.'));
      return;
    }
    if (data.session) {
      try {
        await navigateAfterLogin(data.session);
      } catch (accessError) {
        // Erros inesperados que não foram tratados dentro de navigateAfterLogin
        setError(accessError.message || 'Não foi possível verificar o acesso.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIsSubmitting(false);
    }
  };
  return <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12 dark:bg-slate-950"><Card className="w-full max-w-md border-slate-200 shadow-lg dark:border-slate-800"><CardHeader className="space-y-2"><CardTitle className="text-2xl font-bold">{isRecoveryMode ? 'Recuperar senha' : 'Entrar'}</CardTitle><CardDescription>{isRecoveryMode ? 'Informe seu e-mail para receber as instruções de recuperação.' : 'Use o mesmo e-mail da sua conta MAEZTRO.'}</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={submit}><div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>{!isRecoveryMode && <div className="space-y-2"><Label htmlFor="password">Senha</Label><div className="relative"><Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} required className="pr-10" /><Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></div>}{error && <p className="text-sm text-red-600">{error}</p>}{message && <p className="text-sm text-green-600">{message}</p>}<Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Aguarde...' : isRecoveryMode ? 'Enviar instruções' : 'Entrar'}</Button><button type="button" className="w-full text-sm font-medium text-[#094C7E] hover:underline" onClick={() => { setIsRecoveryMode((current) => !current); setError(''); setMessage(''); }}>{isRecoveryMode ? 'Voltar para o login' : 'Esqueci minha senha'}</button>{!isRecoveryMode && <button type="button" className="w-full text-sm font-medium text-[#094C7E] hover:underline" onClick={() => navigate('/primeiro-acesso')}>1º acesso — criar minha senha</button>}</form></CardContent></Card></div>;
}
