# MAEZTRO Gestão — Plano de migração Kiwify → Google Play Billing

Versão: 1.0
Data: 08/09/2026

## 0. Objetivo

Migrar completamente a comercialização do MAEZTRO Gestão da Kiwify para o Google Play Billing, sem manter compatibilidade comercial com a Kiwify.

Não existem assinaturas pagas reais na Kiwify neste momento. Portanto, a migração pode substituir a arquitetura atual diretamente, preservando apenas o que ainda é funcionalmente necessário:

- autenticação Supabase;
- perfis e papel `admin`;
- período de teste gratuito;
- acesso vitalício concedido manualmente pelo administrador;
- controle centralizado de acesso por entitlement;
- acesso ao mesmo SaaS pela Web e pelo Android.

O backend deve ser a fonte de verdade sobre o acesso. O frontend nunca deve liberar acesso apenas porque o cliente Android informou que uma compra ocorreu.

A documentação oficial do Google recomenda um backend seguro para validar compras, sincronizar o ciclo de vida das assinaturas e atualizar os entitlements. RTDN deve ser tratado como uma notificação de mudança, seguida de consulta à Google Play Developer API para obter o estado completo. [Google Play Billing Backend](https://developer.android.com/google/play/billing/backend)

---

# 1. Regra fundamental da nova arquitetura

A arquitetura final será:

Google Play Billing
→ compra no Android
→ `purchaseToken`
→ Edge Function de verificação
→ Google Play Developer API
→ entitlement no Supabase
→ `activate-access`
→ Web + Android

O `purchaseToken` é a prova técnica que deve ser validada no backend. O Google descreve o purchase token como o identificador que representa o entitlement do comprador a um produto no Google Play. [Google Play Billing](https://developer.android.com/google/play/billing/)

O RTDN terá o fluxo:

Google Play
→ Cloud Pub/Sub
→ Edge Function `google-play-rtdn`
→ identificar produto/token
→ consultar Google Play Developer API
→ atualizar entitlement
→ registrar evento

Nunca conceder ou revogar acesso apenas pelo conteúdo bruto de uma RTDN.

---

# 2. Importante: como tratar o e-mail

Não assumir que o Google Play Billing fornecerá ao aplicativo um campo de "e-mail digitado na compra".

O requisito do produto é:

> O usuário deve utilizar no MAEZTRO a mesma conta que será associada à compra.

A implementação recomendada é ainda mais segura:

1. Usuário cria/login na conta MAEZTRO.
2. O Android conhece `auth_user_id` e `user.email`.
3. Usuário escolhe o plano.
4. Android inicia a compra no Google Play.
5. Após a compra, Android recebe o `purchaseToken`.
6. Android envia ao backend:
   - `purchaseToken`
   - `productId`
   - `basePlanId`
   - usuário autenticado pelo JWT do Supabase.
7. O backend valida o token com o Google.
8. Somente depois da validação o backend associa a compra à conta autenticada.
9. O backend grava também o e-mail da conta MAEZTRO no entitlement como registro histórico.

Assim, a associação principal é com `auth_user_id`, e o e-mail funciona como identificação legível e regra de negócio.

Não confiar em um e-mail enviado livremente pelo frontend como prova de propriedade da compra.

Mensagem recomendada na interface:

"Use no MAEZTRO o mesmo e-mail da conta que você deseja utilizar para acessar sua assinatura."

Se o usuário comprar no Google Play com outra conta Google, isso não deve por si só criar uma conta MAEZTRO nem liberar acesso para outra pessoa.

---

# 3. Modelo final de acesso

Usar uma tabela central `entitlements`.

Cada entitlement representa um direito de acesso do usuário.

## `access_type`

Usar:

- `subscription`
- `trial`
- `lifetime`

`admin` NÃO é `access_type`. Administrador é uma função da conta (`profiles.role = 'admin'`).

## Status de entitlement

Usar:

- `pending`
- `active`
- `grace_period`
- `on_hold`
- `canceled`
- `expired`
- `revoked`

Interpretação:

### `pending`
Compra conhecida, mas ainda não confirmada/processada.

### `active`
Usuário possui acesso válido.

### `grace_period`
Google informa que a renovação falhou, mas o período de tolerância ainda mantém o acesso.

### `on_hold`
A assinatura entrou em suspensão por problema de pagamento. O backend deve refletir o estado real retornado pelo Google e aplicar a regra de acesso definida para esse estado.

### `canceled`
Usuário cancelou a renovação, mas a assinatura ainda pode permanecer válida até `access_ends_at`.

Não revogar imediatamente somente porque a renovação automática foi cancelada.

### `expired`
Período de acesso terminou.

### `revoked`
Acesso foi revogado, por exemplo em uma situação de reembolso/void/refund ou por ação administrativa.

---

# 4. Schema recomendado

Substituir as tabelas específicas da Kiwify por um modelo independente do provedor.

## `entitlements`

Campos mínimos:

- `id`
- `auth_user_id`
- `email`
- `access_type`
- `provider`
- `product_id`
- `base_plan_id`
- `purchase_token`
- `status`
- `access_starts_at`
- `access_ends_at`
- `auto_renewing`
- `canceled_at`
- `revoked_at`
- `created_at`
- `updated_at`

Regras:

- `auth_user_id` referencia `auth.users(id)`.
- `purchase_token` deve ser único quando preenchido.
- `access_type = lifetime` não precisa de `purchase_token`.
- `access_type = subscription` deve ter `provider = google_play`.
- `access_type = trial` deve ter `provider = internal`.
- `access_type = lifetime` deve ter `provider = internal`.
- `access_ends_at = NULL` representa acesso sem data de expiração, especialmente lifetime.
- O frontend não pode inserir/alterar entitlement.

Não manter a regra antiga `unique(customer_id, product_id)` sem reavaliar. O usuário pode mudar entre planos/base plans e o token é uma identidade melhor para a assinatura do Google.

---

# 5. Histórico de eventos

Criar `subscription_events` ou `billing_events`.

Campos sugeridos:

- `id`
- `auth_user_id`
- `provider`
- `event_type`
- `purchase_token`
- `product_id`
- `base_plan_id`
- `message_id`
- `payload`
- `processed_at`
- `processing_status`
- `processing_error`
- `created_at`

O `message_id` da RTDN deve ser usado para idempotência. A documentação atual do Google recomenda evitar processamento duplicado de mensagens RTDN pelo `messageId`. [Backend Billing](https://developer.android.com/google/play/billing/backend)

Não excluir histórico de eventos quando o entitlement mudar de estado.

---

# 6. Trial

O trial atual é de 14 dias.

Não eliminar essa funcionalidade.

Há duas opções possíveis. Preferida:

Migrar `billing_trials` para um entitlement de `access_type = 'trial'`.

Isso cria um único modelo de autorização:

- assinatura = entitlement
- trial = entitlement
- vitalícia = entitlement

A criação do trial continua sendo feita pelo backend e nunca diretamente pelo frontend.

O frontend apenas solicita:

`start-trial`

A Edge Function:

1. autentica o usuário;
2. verifica se já existe entitlement de trial para aquele usuário/e-mail;
3. se já existir, retorna o estado;
4. se não existir, cria o entitlement;
5. define `access_starts_at = now()`;
6. define `access_ends_at = now() + 14 dias`;
7. define `access_type = trial`;
8. define `status = active`;
9. define `provider = internal`.

O usuário não pode criar um segundo trial simplesmente apagando dados do frontend.

---

# 7. Licença vitalícia

O administrador será o único responsável por criar licenças vitalícias.

Usar:

- `access_type = lifetime`
- `provider = internal`
- `status = active`
- `access_ends_at = NULL`
- `purchase_token = NULL`

A criação deve ocorrer exclusivamente através de uma Edge Function administrativa.

Exemplo conceitual:

`admin-create-lifetime-license`

Entrada:

- e-mail do usuário;
- opcionalmente nome;
- opcionalmente observação interna.

A função deve:

1. validar JWT;
2. consultar `profiles.role`;
3. exigir `role = admin`;
4. normalizar o e-mail;
5. localizar ou criar o usuário necessário;
6. criar o entitlement;
7. retornar o estado.

Não permitir que o frontend simplesmente envie `access_type = lifetime` para uma função pública.

---

# 8. Administrador

Manter:

`profiles.role = 'admin'`

O administrador é o proprietário da operação do MAEZTRO.

Ele deve conseguir:

- consultar usuários;
- consultar entitlements;
- consultar status;
- criar licença vitalícia;
- consultar assinatura;
- consultar plano;
- consultar data de expiração;
- consultar se a renovação automática está ativa;
- consultar eventos de billing.

Não colocar essas permissões em `access_type`.

A função administrativa deve verificar a role no backend.

---

# 9. Produtos no Google Play

Criar uma assinatura no Play Console.

Recomendação:

Subscription product ID:

`maeztro_pro`

Criar dois base plans:

`monthly`

Preço:

R$ 29,90

`annual`

Preço:

R$ 274,90

A documentação atual do Google permite configurar uma assinatura com base plans, incluindo preço e modalidade de renovação. [Criar e configurar produtos](https://developer.android.com/google/play/billing/getting-ready)

A economia do plano anual é:

12 × R$ 29,90 = R$ 358,80

Plano anual = R$ 274,90

Economia anual nominal = R$ 83,90.

---

# 10. Não criar dois produtos independentes sem necessidade

Preferir:

`maeztro_pro`
- base plan `monthly`
- base plan `annual`

em vez de:

`maeztro_monthly`
`maeztro_annual`

O backend deverá registrar tanto `product_id` quanto `base_plan_id`.

Isso deixa o modelo preparado para futuros planos/ofertas.

---

# 11. Configuração no Play Console

Quando a conta de organização estiver pronta:

1. Criar/selecionar o app MAEZTRO Gestão.
2. Ativar monetização/Google Play Billing.
3. Criar a assinatura `maeztro_pro`.
4. Criar o base plan `monthly`.
5. Criar o base plan `annual`.
6. Configurar R$ 29,90 para mensal.
7. Configurar R$ 274,90 para anual.
8. Ativar os base plans.
9. Configurar os países/regiões desejados.
10. Criar a infraestrutura de acesso à Google Play Developer API.
11. Criar o tópico Cloud Pub/Sub para RTDN.
12. Vincular a configuração de RTDN ao app.
13. Testar primeiro com contas de teste.

O Google informa que contas de organização precisam de D-U-N-S e que os dados da organização são vinculados ao perfil para pagamentos. Para o Brasil, a documentação de verificação deve ser seguida conforme os documentos aceitos no país. [Conta de organização](https://support.google.com/googleplay/android-developer/answer/13628312?hl=pt-BR) [Documentos do Brasil](https://support.google.com/googleplay/android-developer/answer/15633622?co=GENIE.CountryCode%3DBR&hl=pt-BR)

---

# 12. Package name

O backend deve usar o package name real do Android.

NÃO inventar esse valor.

A IA que executar a migração deve descobrir o `applicationId`/package existente no projeto Capacitor/Android e usar exatamente o valor já publicado/configurado.

---

# 13. Google Play Developer API

Criar uma identidade de serviço para o backend acessar a Google Play Developer API.

O backend precisará consultar a assinatura/purchase token no Google.

Nunca colocar:

- service account JSON;
- private key;
- access token;
- credenciais Google;

no React, Vite, APK ou variáveis `VITE_*`.

Esses dados devem permanecer nos secrets/configuração segura da infraestrutura backend.

A documentação oficial do Google define a Google Play Developer API como a API usada pelo backend para sincronizar compras e assinaturas. [Backend Billing](https://developer.android.com/google/play/billing/backend)

---

# 14. Edge Functions finais

A arquitetura deve ficar aproximadamente assim:

## `activate-access`

Continua sendo o ponto central usado pelo frontend.

Deve:

1. validar o JWT;
2. consultar `profiles.role`;
3. se admin:
   - retornar `status = active`;
   - `is_admin = true`;
4. se não admin:
   - consultar entitlement ativo;
   - considerar trial;
   - considerar subscription;
   - considerar lifetime;
5. retornar somente o estado necessário ao frontend.

Resposta esperada, conceitualmente:

```json
{
  "status": "active",
  "access_type": "subscription",
  "access_ends_at": "..."
}
```

Para lifetime:

```json
{
  "status": "active",
  "access_type": "lifetime",
  "access_ends_at": null
}
```

Para trial:

```json
{
  "status": "active",
  "access_type": "trial",
  "access_ends_at": "..."
}
```

Não retornar `paid` como `access_type`. O novo modelo usa `subscription`.

---

# 15. `google-play-verify`

Criar uma Edge Function responsável por validar uma compra.

Fluxo:

1. receber JWT;
2. identificar `auth_user_id`;
3. receber `purchaseToken`;
4. receber `productId`;
5. receber `basePlanId`;
6. validar formato dos dados;
7. consultar Google Play Developer API;
8. confirmar que o produto pertence ao aplicativo;
9. confirmar que a assinatura é válida;
10. confirmar que o token corresponde ao produto;
11. determinar estado atual;
12. criar/atualizar entitlement;
13. registrar evento;
14. retornar o estado de acesso.

Nunca confiar no `price`, `email`, `status` ou `access_ends_at` enviados pelo Android.

Esses dados devem vir do Google.

---

# 16. Vinculação da compra

A chamada deve ser autenticada.

O Android não deve dizer:

```json
{
  "email": "qualquer@email.com"
}
```

e esperar que o backend confie nisso.

A chamada deve usar o JWT do Supabase.

Exemplo conceitual:

```json
{
  "purchaseToken": "...",
  "productId": "maeztro_pro",
  "basePlanId": "monthly"
}
```

O backend descobre o usuário através do JWT.

Depois da validação, salva:

- `auth_user_id`;
- e-mail atual da conta MAEZTRO;
- purchase token;
- product ID;
- base plan;
- datas;
- status;
- renovação automática.

---

# 17. Compra já existente

O backend precisa ser idempotente.

Se o mesmo `purchaseToken` chegar novamente:

- não criar outro entitlement;
- atualizar o existente;
- retornar o estado atual.

Isso é especialmente importante porque o fluxo pode ser repetido após:

- reinstalação;
- troca de dispositivo;
- restauração de compra;
- login novamente;
- retry de rede.

---

# 18. `google-play-rtdn`

Criar uma Edge Function para receber notificações do Google via Cloud Pub/Sub.

A função deve:

1. receber a mensagem;
2. validar o formato;
3. extrair `messageId`;
4. verificar idempotência;
5. decodificar o payload;
6. identificar package name;
7. identificar purchase token;
8. identificar o tipo de evento;
9. consultar a Google Play Developer API;
10. obter o estado completo;
11. localizar o entitlement pelo purchase token;
12. atualizar o entitlement;
13. registrar o evento;
14. responder sucesso.

A RTDN não deve ser tratada como uma fonte completa de dados. O próprio Google informa que a aplicação deve chamar a Google Play Developer API após receber a RTDN. [RTDN Reference](https://developer.android.com/google/play/billing/rtdn-reference)

---

# 19. Estados do Google → estados internos

Criar uma camada de tradução.

Não espalhar códigos específicos do Google pelo frontend.

Exemplo conceitual:

Google ativo
→ `active`

Cancelamento com acesso ainda válido
→ `canceled`

Período de tolerância
→ `grace_period`

Suspensão
→ `on_hold`

Fim da assinatura
→ `expired`

Revogado/reembolsado
→ `revoked`

A implementação final deve seguir os estados efetivamente retornados pela versão atual da Google Play Developer API.

---

# 20. Cancelamento

Cancelar renovação não significa necessariamente perder acesso imediatamente.

Exemplo:

Assinatura mensal:

01/09 compra
01/10 próxima renovação

Usuário cancela em 15/09.

O entitlement pode ficar:

`status = canceled`

`access_ends_at = 01/10`

O usuário continua utilizando o MAEZTRO até 01/10.

Se houver nova renovação, o backend deve sincronizar o estado novamente.

---

# 21. Reembolso / revogação

Quando a Google informar que a compra não deve mais conceder acesso:

`status = revoked`

Preencher:

`revoked_at`

O frontend deverá deixar de considerar esse entitlement ativo.

Não apagar o registro.

O histórico financeiro precisa continuar existindo para auditoria.

---

# 22. `first-access`

A função atual é específica da Kiwify.

Depois da migração:

- remover a referência à Kiwify;
- não pedir "e-mail da Kiwify";
- não usar essa função para validar compra;
- não enviar convite baseado em uma compra Kiwify.

Se o fluxo de criação de conta continuar necessário, criar uma experiência genérica de primeiro acesso MAEZTRO.

Como a arquitetura recomendada exige uma conta autenticada antes da associação da compra, a necessidade de `first-access` provavelmente diminuirá bastante.

A IA deve verificar o fluxo atual antes de excluir a tela.

---

# 23. `kiwify-webhook`

Depois que a migração estiver validada:

- remover deployment;
- remover secrets Kiwify;
- remover código;
- remover referências do frontend;
- remover tabelas específicas;
- remover produtos Kiwify.

Não manter webhook Kiwify "por garantia", pois o objetivo é abandonar completamente o provedor.

---

# 24. Tabelas Kiwify que podem ser removidas

Depois de confirmar que não há dados comerciais que precisam ser preservados:

- `billing_products`
- `billing_orders`
- `billing_subscriptions`
- `billing_webhook_events`

`billing_customers` também pode ser removida se não houver outra função no sistema que dependa dela.

A nova arquitetura deve preferir vínculo direto entre `auth.users` e `entitlements`.

Não apagar `billing_trials` antes de migrar o trial para o novo modelo.

---

# 25. RLS

A regra deve continuar sendo:

Frontend:

- pode consultar seu próprio entitlement;
- não pode criar;
- não pode alterar;
- não pode revogar;
- não pode mudar status;
- não pode mudar `access_type`;
- não pode mudar `access_ends_at`.

Backend:

- Edge Functions com `service_role` podem alterar entitlements.

Admin:

- ações administrativas devem ocorrer através de Edge Functions;
- não confiar em uma role enviada pelo frontend.

---

# 26. Problema importante no RLS atual

A política atual de `billing_entitlements` depende de:

`billing_customers.auth_user_id = auth.uid()`

Na nova arquitetura, não é necessário manter essa camada intermediária.

Preferir:

```sql
using (auth_user_id = auth.uid())
```

Isso reduz complexidade e elimina uma tabela intermediária cuja função original era resolver a relação Kiwify → cliente → conta.

---

# 27. AuthContext

O `AuthContext` deve continuar chamando:

`activate-access`

Não mover a regra de autorização para o React.

Alterar somente os estados necessários:

Antes:

- `paid`
- `trial`

Depois:

- `subscription`
- `trial`
- `lifetime`

O estado `admin` continua sendo separado por `isAdmin`.

Exemplo:

```text
accessStatus:
idle
checking
active
no_license
trial_expired
verification_error

accessType:
subscription
trial
lifetime
null
```

Não deixar o frontend decidir que `accessType = lifetime` é válido sem o backend ter retornado `status = active`.

---

# 28. Android

Criar uma camada isolada para Google Play Billing.

Exemplo conceitual:

```text
src/
  services/
    billing/
      googlePlayBilling.js
```

Essa camada será responsável por:

- conectar ao BillingClient/plugin utilizado pelo projeto;
- consultar produtos;
- iniciar compra;
- receber resultado;
- obter purchase token;
- reconhecer/acknowledge a compra quando necessário;
- enviar purchase token ao backend;
- consultar/restaurar compras.

Não espalhar código Google Play pelo React.

---

# 29. Não criar lógica de pagamento no Supabase sem necessidade

O Android é responsável por iniciar a experiência de compra.

O backend é responsável por:

- validação;
- persistência;
- entitlement;
- sincronização;
- segurança.

O Supabase não deve "simular" uma compra.

---

# 30. Web

A versão Web deve continuar utilizando:

`activate-access`

O acesso não depende de o usuário estar no Android.

Exemplo:

Usuário compra no Android
→ entitlement no Supabase
→ abre maeztro no navegador
→ login
→ `activate-access`
→ acesso liberado.

Esse é um dos objetivos centrais da arquitetura.

---

# 31. Conta Google ≠ conta MAEZTRO

Não assumir que o e-mail da conta Google Play é a mesma identidade da conta MAEZTRO.

A identidade do MAEZTRO é:

`auth_user_id`

A compra do Google é:

`purchaseToken`

A associação entre os dois é realizada pelo backend depois da validação.

O e-mail é armazenado como informação auxiliar/histórica.

---

# 32. Segurança contra transferência indevida

Se um purchase token já estiver associado a outro `auth_user_id`:

NÃO transferir automaticamente.

Retornar erro administrativo, por exemplo:

`purchase_already_linked`

Isso evita que uma pessoa obtenha um token de outra conta e tente associá-lo à própria conta.

O administrador poderá resolver casos excepcionais manualmente.

---

# 33. Licença vitalícia e assinatura simultâneas

Definir uma regra clara.

Recomendação:

Se o usuário possui `lifetime active`, ele já possui acesso permanente.

Uma assinatura posterior não deve remover o lifetime.

O `activate-access` deve procurar primeiro:

1. admin;
2. lifetime ativo;
3. subscription ativa;
4. trial ativo.

Essa prioridade deve ser implementada no backend.

---

# 34. Trial + assinatura

Se o usuário iniciar trial e posteriormente comprar:

A assinatura passa a ser a fonte principal.

O trial não deve continuar concedendo acesso independente da assinatura.

Pode permanecer registrado para histórico, mas o `activate-access` deve priorizar:

`subscription` > `trial`.

---

# 35. Não misturar status de pagamento com status de acesso

O banco deve diferenciar:

- estado retornado pelo Google;
- estado do entitlement.

O frontend só precisa conhecer o estado de acesso.

Exemplo:

Google pode possuir um estado técnico específico.

Backend traduz para:

`active`

`canceled`

`grace_period`

etc.

Essa camada de tradução protege o frontend contra mudanças da API do Google.

---

# 36. Variáveis/secrets

Nunca versionar:

- Google service account private key;
- OAuth credentials;
- Supabase service role;
- Resend API key;
- qualquer token de Pub/Sub;
- qualquer segredo do Google Play.

Possíveis secrets da nova infraestrutura:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_PLAY_PACKAGE_NAME
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
```

Os nomes exatos podem variar conforme a estratégia de autenticação adotada.

A IA não deve inventar credenciais.

---

# 37. Resend

`send-email` não precisa ser removido automaticamente.

Ele não é parte da Kiwify.

Verificar seus consumidores antes de alterar.

Se continuar sendo usado por outras funcionalidades do MAEZTRO, preservar.

---

# 38. Ordem obrigatória da migração

A IA deve executar em pequenas tarefas e parar após cada etapa.

## Fase 1 — Auditoria

Não alterar código.

Mapear:

- todas as referências a `billing_*`;
- todas as referências a Kiwify;
- todas as chamadas `activate-access`;
- todos os usos de `accessType`;
- todos os usos de `accessStatus`;
- todas as telas de compra;
- todo código Android relacionado a billing;
- todas as migrations SQL;
- todos os secrets/documentação.

Resultado esperado: relatório antes de qualquer alteração.

## Fase 2 — Banco

Criar migration nova.

Não editar destrutivamente arquivos históricos.

Criar:

- `entitlements`
- `subscription_events`

Migrar trial existente, se necessário.

Criar RLS.

Criar índices e constraints.

## Fase 3 — Backend de acesso

Atualizar `activate-access`.

Atualizar `start-trial`.

Criar `admin-create-lifetime-license`.

Criar `google-play-verify`.

Criar `google-play-rtdn`.

Ainda não remover Kiwify.

## Fase 4 — Android Billing

Implementar camada Google Play Billing.

Criar fluxo:

login
→ escolher plano
→ Google Play
→ purchaseToken
→ verify
→ entitlement
→ refreshAccess.

## Fase 5 — Testes

Testar:

- trial;
- assinatura mensal;
- assinatura anual;
- renovação;
- cancelamento;
- expiração;
- restore purchase;
- reinstalação;
- login Web;
- login Android;
- purchase token duplicado;
- token associado a outra conta;
- lifetime;
- admin;
- revogação;
- erro de API;
- perda de internet.

## Fase 6 — Desativação Kiwify

Somente depois de todos os testes:

- remover webhook;
- remover secrets;
- remover código;
- remover tabelas;
- remover telas específicas;
- remover referências.

## Fase 7 — Produção

Publicar versão Android.

Monitorar:

- RTDN;
- validações;
- entitlements;
- erros;
- cancelamentos;
- reembolsos.

---

# 39. Regra para a IA que fará a migração

IMPORTANTE:

Não executar a migração inteira em uma única tarefa.

A IA deve trabalhar por etapas.

Antes de alterar:

1. localizar o arquivo;
2. mostrar o que será alterado;
3. explicar dependências;
4. fazer a alteração mínima;
5. executar build/lint/teste correspondente;
6. informar o resultado;
7. só então seguir para a próxima etapa.

Não criar arquivos ou funções duplicadas se já existir implementação equivalente.

Não renomear componentes sem necessidade.

Não modificar tabelas de negócio como `student`, `lesson`, `transaction`, `receipt`, `client`, `quote` etc., salvo se houver dependência direta comprovada.

Não alterar o fluxo de aulas, pagamentos internos do professor ou recibos, pois esses dados são parte do domínio do MAEZTRO e não do billing da assinatura.

---

# 40. Critérios de aceitação

A migração só estará concluída quando:

- Kiwify não for mais necessária;
- Google Play for o único provedor comercial Android;
- backend validar todas as compras;
- frontend não conseguir fabricar acesso;
- entitlement for a fonte central de autorização;
- Web e Android utilizarem a mesma autorização;
- trial continuar funcionando;
- admin continuar funcionando;
- lifetime funcionar;
- mensal funcionar;
- anual funcionar;
- cancelamento funcionar;
- expiração funcionar;
- RTDN funcionar;
- restauração de compra funcionar;
- purchase token duplicado não criar acesso duplicado;
- purchase token de outra conta não puder ser roubado;
- build Android funcionar;
- build Web funcionar;
- RLS estiver ativo;
- nenhum segredo estiver no frontend;
- nenhuma referência operacional à Kiwify permanecer.

---

# 41. Checklist do Google Play antes do desenvolvimento

[ ] Conta de desenvolvedor criada/verificada.

[ ] Conta de organização configurada.

[ ] D-U-N-S informado.

[ ] Perfil para pagamentos vinculado.

[ ] Identidade/organização verificada.

[ ] Aplicativo criado no Play Console.

[ ] Package name confirmado.

[ ] Google Play Billing configurado.

[ ] Subscription `maeztro_pro` criado.

[ ] Base plan `monthly` criado.

[ ] Base plan `annual` criado.

[ ] R$ 29,90 configurado.

[ ] R$ 274,90 configurado.

[ ] Testadores configurados.

[ ] Google Play Developer API configurada.

[ ] Service account criada/configurada.

[ ] Permissões da API configuradas.

[ ] Cloud Pub/Sub configurado.

[ ] RTDN configurada.

[ ] Backend recebendo RTDN.

[ ] Compra de teste validada.

[ ] Renovação/cancelamento testados.

---

# 42. Observação sobre conta de organização

Como o MAEZTRO é um produto comercial/profissional, usar conta de organização é a opção coerente.

A documentação atual do Google diz que contas de organização são destinadas a atividades comerciais, industriais, profissionais ou empresariais e exigem D-U-N-S. [Tipos de conta](https://support.google.com/googleplay/android-developer/answer/13634885?hl=pt-BR)

O Google também informa que o D-U-N-S é obrigatório para contas de organização e que pode levar tempo para ser emitido. [Informações para criar conta](https://support.google.com/googleplay/android-developer/answer/13628312?hl=pt-BR)

---

# 43. Regra final para o agente de IA

Você está migrando um sistema de billing existente, não criando um billing do zero.

Preserve:

- Supabase Auth;
- profiles;
- role admin;
- trial de 14 dias;
- domínio de alunos;
- aulas;
- transações internas do professor;
- recibos;
- demais funcionalidades do MAEZTRO.

Substitua:

Kiwify
→ Google Play Billing

Kiwify webhook
→ Google Play verify + RTDN

billing_entitlements baseado em Kiwify
→ `entitlements` independente do provedor

Kiwify customer email
→ conta autenticada MAEZTRO (`auth_user_id`) + e-mail histórico

`paid`
→ `subscription`

Crie:

- `entitlements`
- `subscription_events`
- `google-play-verify`
- `google-play-rtdn`
- `admin-create-lifetime-license`
- camada Android de Google Play Billing

Remova somente depois dos testes:

- `kiwify-webhook`
- tabelas Kiwify
- secrets Kiwify
- telas específicas da Kiwify

Não faça mudanças fora do escopo de billing.

---

# 44. Resultado esperado

A arquitetura final deve ser:

```text
                    ┌─────────────────────┐
                    │     Google Play     │
                    │     Billing         │
                    └──────────┬──────────┘
                               │
                         purchaseToken
                               │
                               ▼
                    ┌─────────────────────┐
                    │ google-play-verify  │
                    │      Edge Function  │
                    └──────────┬──────────┘
                               │
                         Google API
                               │
                               ▼
                    ┌─────────────────────┐
                    │     entitlements   │
                    │      Supabase       │
                    └──────────┬──────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
       ┌─────────────────┐          ┌─────────────────┐
       │       Web       │          │     Android     │
       │ activate-access │          │ activate-access │
       └─────────────────┘          └─────────────────┘


Google Play
     │
     ▼
Cloud Pub/Sub
     │
     ▼
google-play-rtdn
     │
     ▼
Google Play Developer API
     │
     ▼
entitlements
```

A regra mais importante de todo o sistema é:

**Google confirma a compra. O backend confirma o Google. O entitlement determina o acesso. O frontend apenas apresenta o acesso concedido pelo backend.**

