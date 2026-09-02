# Kiwify webhook

## Antes de publicar

1. Execute `../billing_schema.sql` no SQL Editor.
2. Cadastre o produto em `billing_products` com o Product ID da Kiwify.
3. Defina os secrets da Edge Function, sem usar variáveis `VITE_*`:

```bash
supabase secrets set KIWIFY_WEBHOOK_TOKEN="gere-um-segredo-longo"
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidas automaticamente
para Edge Functions hospedadas. Nunca copie a service role para o frontend,
Vercel ou arquivo versionado.

## Publicação

```bash
supabase functions deploy kiwify-webhook --no-verify-jwt
```

Cadastre na Kiwify a URL abaixo, incluindo o mesmo segredo configurado em
`KIWIFY_WEBHOOK_TOKEN`:

```text
https://SEU-PROJETO.supabase.co/functions/v1/kiwify-webhook?token=SEU-SEGREDO
```

Ative os eventos: compra aprovada, renovação, atraso, cancelamento, reembolso
e chargeback. Não ative boleto gerado, PIX gerado, carrinho abandonado ou compra
recusada: eles não concedem licença. Use o botão de teste da Kiwify e confirme em
`billing_webhook_events` que o payload foi registrado e processado.

Não coloque o token ou a service role no React, na Vercel, ou em variáveis
`VITE_*`.
