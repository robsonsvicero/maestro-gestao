import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setError('');
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (password !== confirmation) { setError('As senhas não coincidem.'); return; }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) { setError('Este link é inválido ou expirou. Solicite um novo acesso.'); return; }
    navigate('/', { replace: true });
  };
  return <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12 dark:bg-slate-950"><Card className="w-full max-w-md shadow-lg"><CardHeader><CardTitle>Defina sua senha</CardTitle><CardDescription>Crie uma senha para acessar sua assinatura do Maestro Gestão.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={submit}><div className="space-y-2"><Label htmlFor="new-password">Nova senha</Label><Input id="new-password" type="password" minLength="6" required value={password} onChange={(event) => setPassword(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="confirm-password">Confirmar senha</Label><Input id="confirm-password" type="password" minLength="6" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>{error && <p className="text-sm text-red-600">{error}</p>}<Button className="w-full" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar e entrar'}</Button></form></CardContent></Card></div>;
}
