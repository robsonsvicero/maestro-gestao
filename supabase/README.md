# Migrações do Supabase

## Fase 1 — dados por professor

Execute `user_data_rls.sql` uma única vez no SQL Editor do Supabase antes de
comercializar o aplicativo.

O script adiciona `user_id` às tabelas do aplicativo, atribui os registros já
existentes ao professor indicado e aplica RLS para que cada usuário autenticado
possa ler e alterar somente os próprios dados.

Antes de executar:

1. Crie ou confirme a conta do professor em **Authentication > Users**.
2. Abra `user_data_rls.sql` e substitua
   `SUBSTITUA-PELO-EMAIL-DO-PROFESSOR` pelo e-mail dessa conta.
3. Cole o script completo no **SQL Editor** e execute.
4. Saia e entre novamente no aplicativo; cadastre um aluno de teste e confirme
   que ele aparece apenas nesta conta.

Não execute `transaction_rls.sql`: ele foi mantido apenas como aviso de que a
política anterior era ampla demais para um produto comercial.

Se você executou uma versão anterior de `user_data_rls.sql`, execute também
`security_hardening.sql` para impedir que um usuário altere o próprio papel.

## Rotina de aulas futuras

Depois de executar `user_data_rls.sql`, execute novamente
`maintain_future_lessons.sql`. A versão atual preserva o `user_id` do professor
ao criar aulas mensais pela rotina do banco.

## Fase 2 — Kiwify

Execute `google_play_billing_schema.sql` e, se ele já tiver sido executado,
`kiwify_entitlements_migration.sql` antes de publicar a Edge Function. As
instruções de secrets, deploy e teste ficam em `functions/kiwify-webhook/README.md`.

## Fase 3 — ativação do comprador

Publique também a Edge Function `activate-access`:

```bash
supabase functions deploy activate-access --no-verify-jwt
```

Na compra Kiwify aprovada, o webhook cria e convida a conta com o e-mail do
comprador. O professor define a senha pelo link recebido e acessa tanto o site
quanto o app futuro com essa mesma conta.

## Administração de licenças

Publique `admin-licenses` para habilitar a tela `/AdminLicenses`:

```bash
supabase functions deploy admin-licenses --no-verify-jwt
```

Ela exige `profiles.role = 'admin'` no servidor e permite consultar licenças e
eventos, além de liberar ou revogar manualmente uma licença.
