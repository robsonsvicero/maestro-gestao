# Maestro Gestão

## Configurações do App Android (Capacitor)

Este projeto utiliza o Capacitor para empacotar a aplicação web como um aplicativo Android.

- **Localização do `build.gradle` (app/module):** O arquivo principal de configuração do módulo do aplicativo está localizado em `android/app/build.gradle`. As variáveis de versão estão definidas em `android/variables.gradle`.
- **Versão do SDK Alvo (Target SDK):** Atualmente, a versão alvo (`targetSdkVersion`) está configurada para **36** (conforme definido em `android/variables.gradle`).
- **Google Play Billing:** a integração nativa usa `@capgo/native-purchases` e está isolada em `src/services/billing/googlePlayBilling.js`. A compra só é reconhecida depois da validação pela Edge Function `google-play-verify`.

## ⚠️ Atenção: Arquivos Sensíveis

Antes de realizar commits ou enviar o projeto para repositórios públicos, **certifique-se de que arquivos sensíveis estão ignorados** no `.gitignore`. 
Os seguintes arquivos **nunca devem ser enviados**:
- `.env.local` (contém chaves reais e de desenvolvimento local)
- `.env`
- `google-services.json` (se existir dentro da pasta `android/app/`, pois contém credenciais do Firebase/Google)
- Chaves de assinatura como `.keystore` ou `.jks` (se geradas na pasta `android/`)

Use o arquivo `.env.example` apenas como referência de quais variáveis são necessárias.

---

## Deploy na Hostinger

O projeto é uma aplicação React/Vite estática. Execute o build e envie o conteúdo da pasta `dist/` para a pasta pública do domínio na Hostinger, normalmente `public_html/`. O arquivo `public/.htaccess` é copiado para `dist/` e mantém rotas como `/Schedule`, `/Settings` e `/login` funcionando ao atualizar a página diretamente.

Antes do build, configure as variáveis de ambiente no arquivo `.env.local` ou no ambiente de build da Hostinger:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-ou-publishable-do-supabase
```

Não envie o arquivo `.env.local` ao repositório e **nunca adicione `SUPABASE_SERVICE_ROLE_KEY` à Hostinger nem ao frontend**: ela concede privilégios administrativos ao banco e não deve ser exposta no navegador.

Depois de publicar o domínio, adicione-o no Supabase em **Authentication → URL Configuration**:

- **Site URL**: `https://app-maeztro.gestfors.com.br`;
- **Redirect URLs**: `https://app-maeztro.gestfors.com.br/Settings` e `https://app-maeztro.gestfors.com.br/login`.

Para recuperação de senha, confirme que o provedor SMTP está configurado no Supabase.
