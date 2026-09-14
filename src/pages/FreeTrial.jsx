import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

export default function FreeTrial() {
  const navigate = useNavigate();
  const { isAuthenticated, refreshAccess } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const hasActivatedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || hasActivatedRef.current) return;
    hasActivatedRef.current = true;
    let mounted = true;
    const activateTrial = async () => {
      setIsSubmitting(true);
      const { data, error: trialError } = await supabase.functions.invoke('start-trial', { body: {} });
      if (!mounted) return;
      if (trialError || data?.error) {
        setError(data?.error || trialError?.message || 'Não foi possível iniciar o teste gratuito.');
        setIsSubmitting(false);
        return;
      }
      const status = await refreshAccess();
      if (mounted && status === 'active') {
        setShowSuccessModal(true);
      }
      if (mounted) setIsSubmitting(false);
    };
    activateTrial();
    return () => { mounted = false; };
  }, [isAuthenticated, navigate, refreshAccess]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/teste-gratis` },
    });

    if (signUpError) {
      setError(signUpError.message || 'Não foi possível criar sua conta.');
      setIsSubmitting(false);
      return;
    }

    if (data?.session) {
      const { data: trialData, error: trialError } = await supabase.functions.invoke('start-trial', { body: {} });
      if (trialError || trialData?.error) {
        setError(trialData?.error || trialError?.message || 'Não foi possível iniciar seu teste.');
        setIsSubmitting(false);
        return;
      }
      await refreshAccess();
      setShowSuccessModal(true);
      setIsSubmitting(false);
    } else {
      setShowSuccessModal(true);
      setIsSubmitting(false);
    }
  };

  const handleGoToApp = async () => {
    await supabase.auth.signOut().catch(() => {});
    navigate('/login', { replace: true });
  };

  if (isAuthenticated && isSubmitting && !showSuccessModal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-slate-600 dark:text-slate-300 font-medium">Ativando seu teste gratuito...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12 dark:bg-slate-950 relative">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Teste grátis por 14 dias</CardTitle>
          <CardDescription>Crie sua conta e experimente o Maestro Gestão sem compromisso.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="trial-email">E-mail</Label>
              <Input
                id="trial-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trial-password">Senha</Label>
              <div className="relative">
                <Input
                  id="trial-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength="6"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Aguarde...' : 'Começar teste grátis'}
            </Button>
            <button
              type="button"
              className="w-full text-sm font-medium text-[#094C7E] hover:underline"
              onClick={() => navigate('/login')}
            >
              Já tenho uma conta
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Modal / Popover de Confirmação */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl border-emerald-500/20 bg-white dark:bg-slate-900">
            <CardHeader className="text-center space-y-3 pb-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <CardTitle className="text-2xl text-emerald-700 dark:text-emerald-400">Cadastro realizado com sucesso!</CardTitle>
              <CardDescription className="text-base text-slate-600 dark:text-slate-300">
                Seus <strong>14 dias de teste gratuito</strong> foram ativados com sucesso no Maestro Gestão.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-4 border text-sm text-slate-600 dark:text-slate-300 space-y-1">
                <p><strong>E-mail cadastrado:</strong> {email}</p>
                <p className="text-xs text-slate-500">Clique no botão abaixo para fazer login e começar a usar o aplicativo.</p>
              </div>
              <Button
                className="w-full bg-[#094C7E] hover:bg-[#07395f] text-white py-6 text-base font-semibold shadow-md"
                onClick={handleGoToApp}
              >
                Ir para o App (Fazer Login)
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
