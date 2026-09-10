# Webhook da Kiwify

Esta função libera o acesso do comprador na tabela central `entitlements`.
Ela também cria a conta no Supabase e envia o convite para definir a senha na
primeira compra aprovada. Assim, a mesma conta poderá entrar tanto pelo site
quanto pelo futuro aplicativo publicado na Google Play.

## Publicação

1. Execute `supabase/kiwify_entitlements_migration.sql` uma vez no SQL Editor
   do Supabase.
2. Copie o token gerado automaticamente pela Kiwify ao criar o webhook e use-o
   como `KIWIFY_WEBHOOK_TOKEN`. `KIWIFY_PRODUCT_IDS` é opcional, mas recomendado:
   informe os IDs dos dois produtos separados por vírgula para impedir que outro
   produto da conta conceda acesso.

```bash
supabase secrets set KIWIFY_WEBHOOK_TOKEN="TOKEN_GERADO_PELA_KIWIFY"
supabase secrets set APP_URL="https://seu-dominio.com"
supabase secrets set KIWIFY_PRODUCT_IDS="ID_PRODUTO_MENSAL,ID_PRODUTO_ANUAL"
supabase functions deploy kiwify-webhook --no-verify-jwt
supabase functions deploy first-access --no-verify-jwt
```

3. Na Kiwify, cadastre esta URL de webhook, substituindo o token pelo mesmo
   token gerado pela Kiwify:

```text
https://SEU-PROJETO.supabase.co/functions/v1/kiwify-webhook?token=SEU-SEGREDO
```

4. Ative os eventos: compra aprovada, renovação, atraso, cancelamento,
   reembolso e chargeback. Não ative boleto/PIX gerado, carrinho abandonado ou
   compra recusada.

Teste uma compra e confirme, em `entitlements`, que foi criado um registro com
`provider = 'kiwify'` e `status = 'active'`. Confirme também que o e-mail de
convite chegou ao comprador.

Nunca exponha o token ou a service role no frontend.
