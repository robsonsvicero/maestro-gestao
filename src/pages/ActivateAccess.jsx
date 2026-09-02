import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ActivateAccess() {
  const navigate = useNavigate();
  const { accessStatus, refreshAccess } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [message, setMessage] = useState('');

  const checkAccess = async () => {
    setIsChecking(true);
    setMessage('');
    const status = await refreshAccess();
    setIsChecking(false);
    if (status === 'active') navigate('/', { replace: true });
    else setMessage('Ainda não encontramos uma licença ativa para este e-mail. Confirme que ele é o mesmo usado na compra.');
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  const needsConfirmation = accessStatus === 'email_confirmation_required';
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12 dark:bg-slate-950">
      <Card className="w-full max-w-md border-slate-200 shadow-lg dark:border-slate-800">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Ativar acesso</CardTitle>
          <CardDescription>
            {needsConfirmation
              ? 'Confirme o e-mail enviado pelo Supabase e depois volte aqui para liberar o acesso.'
              : 'Usamos o e-mail confirmado da sua conta para localizar a licença comprada na Kiwify.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {message && <p className="text-sm text-amber-700 dark:text-amber-300">{message}</p>}
          <Button className="w-full" onClick={checkAccess} disabled={isChecking}>
            {isChecking ? 'Verificando...' : 'Verificar licença'}
          </Button>
          <Button className="w-full" variant="outline" onClick={signOut}>Entrar com outro e-mail</Button>
        </CardContent>
      </Card>
    </div>
  );
}
