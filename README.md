# Maestro Gestão

## Configurações do App Android (Capacitor)

Este projeto utiliza o Capacitor para empacotar a aplicação web como um aplicativo Android.

- **Localização do `build.gradle` (app/module):** O arquivo principal de configuração do módulo do aplicativo está localizado em `android/app/build.gradle`. As variáveis de versão estão definidas em `android/variables.gradle`.
- **Versão do SDK Alvo (Target SDK):** Atualmente, a versão alvo (`targetSdkVersion`) está configurada para **36** (conforme definido em `android/variables.gradle`).
- **Google Play Billing:** **Não há**, no momento, nenhuma integração nativa com a Google Play Billing configurada no projeto (nenhum plugin do Capacitor ou dependência correspondente no `package.json` ou `build.gradle`).

## ⚠️ Atenção: Arquivos Sensíveis

Antes de realizar commits ou enviar o projeto para repositórios públicos, **certifique-se de que arquivos sensíveis estão ignorados** no `.gitignore`. 
Os seguintes arquivos **nunca devem ser enviados**:
- `.env.local` (contém chaves reais e de desenvolvimento local)
- `.env`
- `google-services.json` (se existir dentro da pasta `android/app/`, pois contém credenciais do Firebase/Google)
- Chaves de assinatura como `.keystore` ou `.jks` (se geradas na pasta `android/`)

Use o arquivo `.env.example` apenas como referência de quais variáveis são necessárias.

---

## Deploy de teste no Vercel

O projeto é uma aplicação React/Vite estática. O arquivo `vercel.json` já inclui o fallback necessário para que rotas como `/Schedule`, `/Settings` e `/login` funcionem ao atualizar a página diretamente.

No Vercel, configure as variáveis de ambiente abaixo para os ambientes **Preview** e **Production**:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-ou-publishable-do-supabase
```

Não envie o arquivo `.env.local` ao repositório e **nunca adicione `SUPABASE_SERVICE_ROLE_KEY` ao Vercel**: ela concede privilégios administrativos ao banco e não deve ser exposta no navegador.

Após receber a URL do Vercel, adicione-a no Supabase em **Authentication → URL Configuration**:

- **Site URL**: URL principal do Vercel;
- **Redirect URLs**: `https://seu-projeto.vercel.app/Settings` e `https://seu-projeto.vercel.app/login`.

Para recuperação de senha, confirme que o provedor SMTP está configurado no Supabase.
