import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { getSubscriptionPlans, isGooglePlayBillingAvailable, purchaseSubscription, restoreSubscriptions } from '@/services/billing/googlePlayBilling';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ActivateAccess() {
  const navigate = useNavigate();
  const { accessStatus, refreshAccess } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [plans, setPlans] = useState([]);
  const [isBillingAvailable, setIsBillingAvailable] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [purchasingPlan, setPurchasingPlan] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadPlans = async () => {
      try {
        if (!(await isGooglePlayBillingAvailable())) return;
        const availablePlans = await getSubscriptionPlans();
        if (mounted) {
          setPlans(availablePlans);
          setIsBillingAvailable(true);
        }
      } catch (error) {
        if (mounted) setMessage(error.message || 'Não foi possível carregar os planos.');
      }
    };
    setIsLoadingPlans(true);
    loadPlans().finally(() => mounted && setIsLoadingPlans(false));
    return () => { mounted = false; };
  }, []);

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

  const buyPlan = async (plan) => {
    setPurchasingPlan(plan.identifier);
    setMessage('');
    try {
      await purchaseSubscription(plan);
      const status = await refreshAccess();
      if (status === 'active') navigate('/', { replace: true });
      else setMessage('Compra validada, mas o acesso ainda não está ativo. Tente verificar novamente.');
    } catch (error) {
      setMessage(error.message || 'Não foi possível concluir a compra.');
    } finally {
      setPurchasingPlan(null);
    }
  };

  const restore = async () => {
    setIsChecking(true);
    setMessage('Restaurando suas compras...');
    try {
      await restoreSubscriptions();
      const status = await refreshAccess();
      if (status === 'active') navigate('/', { replace: true });
      else setMessage('Nenhuma assinatura ativa foi encontrada para esta conta.');
    } catch (error) {
      setMessage(error.message || 'Não foi possível restaurar suas compras.');
    } finally {
      setIsChecking(false);
    }
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
              : 'Usamos o e-mail confirmado da sua conta para localizar sua licença ativa.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {message && <p className="text-sm text-amber-700 dark:text-amber-300">{message}</p>}
          {isBillingAvailable && (
            <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-sm font-medium">Escolha seu plano</p>
              {isLoadingPlans && <p className="text-sm text-slate-500">Carregando planos...</p>}
              {plans.map((plan) => (
                <Button key={plan.identifier} className="w-full justify-between" onClick={() => buyPlan(plan)} disabled={isChecking || purchasingPlan !== null}>
                  <span>{plan.identifier === 'annual' ? 'Plano anual' : 'Plano mensal'}</span>
                  <span>{plan.priceString}</span>
                </Button>
              ))}
              <Button className="w-full" variant="outline" onClick={restore} disabled={isChecking || purchasingPlan !== null}>
                Restaurar compras
              </Button>
            </div>
          )}
          <Button className="w-full" onClick={checkAccess} disabled={isChecking}>
            {isChecking ? 'Verificando...' : 'Verificar licença'}
          </Button>
          <Button className="w-full" variant="outline" onClick={signOut}>Entrar com outro e-mail</Button>
        </CardContent>
      </Card>
    </div>
  );
}
